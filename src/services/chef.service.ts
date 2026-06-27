import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { UpdateChefProfileInput } from "../validators/chef.validator";
import { getPaginationParams, buildPaginationMeta } from "../utils/pagination";
import { Request } from "express";

export const getChefProfile = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT cp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
              FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS cuisines,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', cert.id, 'title', cert.title,
                'issuer', cert.issuer, 'issued_year', cert.issued_year, 'file_url', cert.file_url))
              FILTER (WHERE cert.id IS NOT NULL), '[]'
            ) AS certificates
     FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN chef_cuisines cc ON cc.chef_id = cp.id
     LEFT JOIN cuisines c ON c.id = cc.cuisine_id
     LEFT JOIN chef_certificates cert ON cert.chef_id = cp.id
     WHERE cp.user_id = $1 AND u.deleted_at IS NULL
     GROUP BY cp.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url`,
    [userId]
  );

  if (rows.length === 0) throw new AppError("Chef profile not found", 404);
  return rows[0];
};

export const getChefProfileById = async (chefId: string) => {
  const { rows } = await pool.query(
    `SELECT cp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
              FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS cuisines,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', cert.id, 'title', cert.title,
                'issuer', cert.issuer, 'issued_year', cert.issued_year, 'file_url', cert.file_url))
              FILTER (WHERE cert.id IS NOT NULL), '[]'
            ) AS certificates
     FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN chef_cuisines cc ON cc.chef_id = cp.id
     LEFT JOIN cuisines c ON c.id = cc.cuisine_id
     LEFT JOIN chef_certificates cert ON cert.chef_id = cp.id
     WHERE cp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE
     GROUP BY cp.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url`,
    [chefId]
  );

  if (rows.length === 0) throw new AppError("Chef profile not found", 404);
  return rows[0];
};

export const updateChefProfile = async (userId: string, input: UpdateChefProfileInput) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  (Object.keys(input) as (keyof UpdateChefProfileInput)[]).forEach((key) => {
    if (input[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(input[key]);
    }
  });

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  values.push(userId);

  const { rows } = await pool.query(
    `UPDATE chef_profiles SET ${fields.join(", ")}, updated_at = NOW()
     WHERE user_id = $${idx} RETURNING *`,
    values
  );

  if (rows.length === 0) throw new AppError("Chef profile not found", 404);

  await recalculateCompletion(userId);
  return rows[0];
};

export const updateChefCuisines = async (userId: string, cuisineIds: string[]) => {
  const { rows: profile } = await pool.query(
    "SELECT id FROM chef_profiles WHERE user_id = $1",
    [userId]
  );
  if (profile.length === 0) throw new AppError("Chef profile not found", 404);
  const chefId = profile[0].id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM chef_cuisines WHERE chef_id = $1", [chefId]);
    if (cuisineIds.length > 0) {
      const insertValues = cuisineIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await client.query(
        `INSERT INTO chef_cuisines (chef_id, cuisine_id) VALUES ${insertValues}`,
        [chefId, ...cuisineIds]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await recalculateCompletion(userId);
};

export const addCertificate = async (
  userId: string,
  title: string,
  fileUrl: string,
  issuer?: string,
  issuedYear?: number
) => {
  const { rows: profile } = await pool.query(
    "SELECT id FROM chef_profiles WHERE user_id = $1",
    [userId]
  );
  if (profile.length === 0) throw new AppError("Chef profile not found", 404);

  const { rows } = await pool.query(
    `INSERT INTO chef_certificates (chef_id, title, issuer, issued_year, file_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [profile[0].id, title, issuer || null, issuedYear || null, fileUrl]
  );

  await recalculateCompletion(userId);
  return rows[0];
};

export const deleteCertificate = async (userId: string, certId: string) => {
  const { rows: profile } = await pool.query(
    "SELECT id FROM chef_profiles WHERE user_id = $1",
    [userId]
  );
  if (profile.length === 0) throw new AppError("Chef profile not found", 404);

  const { rowCount } = await pool.query(
    "DELETE FROM chef_certificates WHERE id = $1 AND chef_id = $2",
    [certId, profile[0].id]
  );
  if (!rowCount || rowCount === 0) throw new AppError("Certificate not found", 404);
};

export const searchChefs = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const { search, cuisine_id, city, is_available, min_rate, max_rate, min_experience } = req.query;

  const conditions: string[] = ["u.deleted_at IS NULL", "u.is_active = TRUE", "u.role = 'ROLE_CHEF'"];
  const params: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR cp.specialization ILIKE $${idx} OR cp.bio ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (city) { conditions.push(`cp.city ILIKE $${idx++}`); params.push(`%${city}%`); }
  if (is_available !== undefined) { conditions.push(`cp.is_available = $${idx++}`); params.push(is_available === "true"); }
  if (min_rate) { conditions.push(`cp.hourly_rate >= $${idx++}`); params.push(Number(min_rate)); }
  if (max_rate) { conditions.push(`cp.hourly_rate <= $${idx++}`); params.push(Number(max_rate)); }
  if (min_experience) { conditions.push(`cp.years_experience >= $${idx++}`); params.push(Number(min_experience)); }
  if (cuisine_id) { conditions.push(`EXISTS (SELECT 1 FROM chef_cuisines cc WHERE cc.chef_id = cp.id AND cc.cuisine_id = $${idx++})`); params.push(cuisine_id); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT cp.id) FROM chef_profiles cp JOIN users u ON cp.user_id = u.id ${where}`,
    params
  );

  const total = parseInt(countResult.rows[0].count, 10);

  const sortBy = ["hourly_rate", "years_experience", "created_at"].includes(req.query.sortBy as string)
    ? `cp.${req.query.sortBy}`
    : "cp.created_at";
  const sortDir = (req.query.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT cp.*, u.first_name, u.last_name, u.email, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name))
              FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS cuisines
     FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN chef_cuisines cc ON cc.chef_id = cp.id
     LEFT JOIN cuisines c ON c.id = cc.cuisine_id
     ${where}
     GROUP BY cp.id, u.first_name, u.last_name, u.email, u.avatar_url
     ORDER BY ${sortBy} ${sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

const recalculateCompletion = async (userId: string): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT cp.bio, cp.years_experience, cp.specialization, cp.hourly_rate,
            cp.city, cp.is_available,
            (SELECT COUNT(*) FROM chef_cuisines cc WHERE cc.chef_id = cp.id) AS cuisine_count,
            (SELECT COUNT(*) FROM chef_certificates cert WHERE cert.chef_id = cp.id) AS cert_count,
            u.phone, u.avatar_url
     FROM chef_profiles cp JOIN users u ON cp.user_id = u.id
     WHERE cp.user_id = $1`,
    [userId]
  );

  if (rows.length === 0) return;
  const p = rows[0];

  const checks = [
    !!p.bio,
    !!p.years_experience,
    !!p.specialization,
    !!p.hourly_rate,
    !!p.city,
    parseInt(p.cuisine_count) > 0,
    parseInt(p.cert_count) > 0,
    !!p.phone,
    !!p.avatar_url,
  ];

  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  await pool.query(
    "UPDATE chef_profiles SET profile_completion_pct = $1 WHERE user_id = $2",
    [pct, userId]
  );
};

export const getAllCuisines = async () => {
  const { rows } = await pool.query("SELECT * FROM cuisines ORDER BY name ASC");
  return rows;
};
