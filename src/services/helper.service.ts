import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { UpdateHelperProfileInput } from "../validators/helper.validator";
import { getPaginationParams, buildPaginationMeta } from "../utils/pagination";
import { Request } from "express";

export const getHelperProfile = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT hp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name,
                'slug', s.slug, 'category', s.category,
                'proficiency_level', hs.proficiency_level))
              FILTER (WHERE s.id IS NOT NULL), '[]'
            ) AS skills
     FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     LEFT JOIN helper_skills hs ON hs.helper_id = hp.id
     LEFT JOIN skills s ON s.id = hs.skill_id
     WHERE hp.user_id = $1 AND u.deleted_at IS NULL
     GROUP BY hp.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url`,
    [userId]
  );

  if (rows.length === 0) throw new AppError("Helper profile not found", 404);
  return rows[0];
};

export const getHelperProfileById = async (helperId: string) => {
  const { rows } = await pool.query(
    `SELECT hp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name,
                'slug', s.slug, 'category', s.category,
                'proficiency_level', hs.proficiency_level))
              FILTER (WHERE s.id IS NOT NULL), '[]'
            ) AS skills
     FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     LEFT JOIN helper_skills hs ON hs.helper_id = hp.id
     LEFT JOIN skills s ON s.id = hs.skill_id
     WHERE hp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE
     GROUP BY hp.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url`,
    [helperId]
  );

  if (rows.length === 0) throw new AppError("Helper profile not found", 404);
  return rows[0];
};

export const updateHelperProfile = async (userId: string, input: UpdateHelperProfileInput) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  (Object.keys(input) as (keyof UpdateHelperProfileInput)[]).forEach((key) => {
    if (input[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(input[key]);
    }
  });

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  values.push(userId);

  const { rows } = await pool.query(
    `UPDATE helper_profiles SET ${fields.join(", ")}, updated_at = NOW()
     WHERE user_id = $${idx} RETURNING *`,
    values
  );

  if (rows.length === 0) throw new AppError("Helper profile not found", 404);

  await recalculateHelperCompletion(userId);
  return rows[0];
};

export const updateHelperSkills = async (
  userId: string,
  skills: { skill_id: string; proficiency_level?: string }[]
) => {
  const { rows: profile } = await pool.query(
    "SELECT id FROM helper_profiles WHERE user_id = $1",
    [userId]
  );
  if (profile.length === 0) throw new AppError("Helper profile not found", 404);
  const helperId = profile[0].id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM helper_skills WHERE helper_id = $1", [helperId]);
    if (skills.length > 0) {
      const insertValues = skills
        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
        .join(", ");
      const params: unknown[] = [helperId];
      skills.forEach((s) => {
        params.push(s.skill_id, s.proficiency_level || "BEGINNER");
      });
      await client.query(
        `INSERT INTO helper_skills (helper_id, skill_id, proficiency_level) VALUES ${insertValues}`,
        params
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await recalculateHelperCompletion(userId);
};

export const searchHelpers = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const { search, skill_id, city, is_available, min_rate, max_rate } = req.query;

  const conditions: string[] = ["u.deleted_at IS NULL", "u.is_active = TRUE", "u.role = 'ROLE_HELPER'"];
  const params: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR hp.bio ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (city) { conditions.push(`hp.city ILIKE $${idx++}`); params.push(`%${city}%`); }
  if (is_available !== undefined) { conditions.push(`hp.is_available = $${idx++}`); params.push(is_available === "true"); }
  if (min_rate) { conditions.push(`hp.hourly_rate >= $${idx++}`); params.push(Number(min_rate)); }
  if (max_rate) { conditions.push(`hp.hourly_rate <= $${idx++}`); params.push(Number(max_rate)); }
  if (skill_id) {
    conditions.push(`EXISTS (SELECT 1 FROM helper_skills hs WHERE hs.helper_id = hp.id AND hs.skill_id = $${idx++})`);
    params.push(skill_id);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT hp.id) FROM helper_profiles hp JOIN users u ON hp.user_id = u.id ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT hp.*, u.first_name, u.last_name, u.email, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category))
              FILTER (WHERE s.id IS NOT NULL), '[]'
            ) AS skills
     FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     LEFT JOIN helper_skills hs ON hs.helper_id = hp.id
     LEFT JOIN skills s ON s.id = hs.skill_id
     ${where}
     GROUP BY hp.id, u.first_name, u.last_name, u.email, u.avatar_url
     ORDER BY hp.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

export const getAllSkills = async () => {
  const { rows } = await pool.query("SELECT * FROM skills ORDER BY category, name ASC");
  return rows;
};

const recalculateHelperCompletion = async (userId: string): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT hp.bio, hp.years_experience, hp.hourly_rate, hp.city,
            (SELECT COUNT(*) FROM helper_skills hs WHERE hs.helper_id = hp.id) AS skill_count,
            u.phone, u.avatar_url
     FROM helper_profiles hp JOIN users u ON hp.user_id = u.id
     WHERE hp.user_id = $1`,
    [userId]
  );

  if (rows.length === 0) return;
  const p = rows[0];

  const checks = [
    !!p.bio,
    !!p.years_experience,
    !!p.hourly_rate,
    !!p.city,
    parseInt(p.skill_count) > 0,
    !!p.phone,
    !!p.avatar_url,
  ];

  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  await pool.query(
    "UPDATE helper_profiles SET profile_completion_pct = $1 WHERE user_id = $2",
    [pct, userId]
  );
};
