import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { CreateJobInput, UpdateJobInput } from "../validators/job.validator";
import { getPaginationParams, buildPaginationMeta } from "../utils/pagination";
import { Request } from "express";

const JOB_SELECT = `
  SELECT j.*,
         rp.name AS restaurant_name, rp.logo_url AS restaurant_logo, rp.city AS restaurant_city,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name))
           FILTER (WHERE c.id IS NOT NULL), '[]'
         ) AS cuisines,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name))
           FILTER (WHERE s.id IS NOT NULL), '[]'
         ) AS skills
  FROM restaurant_job_posts j
  JOIN restaurant_profiles rp ON j.restaurant_id = rp.id
  LEFT JOIN job_post_cuisines jpc ON jpc.job_id = j.id
  LEFT JOIN cuisines c ON c.id = jpc.cuisine_id
  LEFT JOIN job_post_skills jps ON jps.job_id = j.id
  LEFT JOIN skills s ON s.id = jps.skill_id
`;

const upsertJobRelations = async (
  client: any,
  jobId: string,
  cuisineIds?: string[],
  skillIds?: string[]
) => {
  if (cuisineIds) {
    await client.query("DELETE FROM job_post_cuisines WHERE job_id = $1", [jobId]);
    if (cuisineIds.length > 0) {
      const vals = cuisineIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await client.query(
        `INSERT INTO job_post_cuisines (job_id, cuisine_id) VALUES ${vals}`,
        [jobId, ...cuisineIds]
      );
    }
  }
  if (skillIds) {
    await client.query("DELETE FROM job_post_skills WHERE job_id = $1", [jobId]);
    if (skillIds.length > 0) {
      const vals = skillIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await client.query(
        `INSERT INTO job_post_skills (job_id, skill_id) VALUES ${vals}`,
        [jobId, ...skillIds]
      );
    }
  }
};

export const createJob = async (userId: string, input: CreateJobInput) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [userId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);
  const restaurantId = restaurant[0].id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO restaurant_job_posts
       (restaurant_id, title, description, role_type, salary_min, salary_max,
        salary_type, currency, location, city, is_remote, experience_required,
        openings, status, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        restaurantId, input.title, input.description, input.role_type,
        input.salary_min ?? null, input.salary_max ?? null,
        input.salary_type ?? "MONTHLY", input.currency ?? "INR",
        input.location ?? null, input.city ?? null,
        input.is_remote ?? false, input.experience_required ?? null,
        input.openings ?? 1, input.status ?? "OPEN", input.deadline ?? null,
      ]
    );

    const jobId = rows[0].id;
    await upsertJobRelations(client, jobId, input.cuisine_ids, input.skill_ids);

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const updateJob = async (userId: string, jobId: string, input: UpdateJobInput) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [userId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const { rows: job } = await pool.query(
    "SELECT id FROM restaurant_job_posts WHERE id = $1 AND restaurant_id = $2",
    [jobId, restaurant[0].id]
  );
  if (job.length === 0) throw new AppError("Job post not found or unauthorized", 404);

  const { cuisine_ids, skill_ids, ...rest } = input;
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
    if (rest[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(rest[key]);
    }
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (fields.length > 0) {
      values.push(jobId);
      await client.query(
        `UPDATE restaurant_job_posts SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
        values
      );
    }

    await upsertJobRelations(client, jobId, cuisine_ids, skill_ids);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getJobById(jobId);
};

export const deleteJob = async (userId: string, jobId: string) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [userId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const { rowCount } = await pool.query(
    "DELETE FROM restaurant_job_posts WHERE id = $1 AND restaurant_id = $2",
    [jobId, restaurant[0].id]
  );

  if (!rowCount || rowCount === 0) throw new AppError("Job post not found or unauthorized", 404);
};

export const getJobById = async (jobId: string) => {
  const { rows } = await pool.query(
    `${JOB_SELECT} WHERE j.id = $1 GROUP BY j.id, rp.name, rp.logo_url, rp.city`,
    [jobId]
  );
  if (rows.length === 0) throw new AppError("Job post not found", 404);
  return rows[0];
};

export const getRestaurantJobs = async (userId: string, status?: string) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [userId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const params: unknown[] = [restaurant[0].id];
  let where = "WHERE j.restaurant_id = $1";
  if (status) {
    where += " AND j.status = $2";
    params.push(status);
  }

  const { rows } = await pool.query(
    `${JOB_SELECT} ${where} GROUP BY j.id, rp.name, rp.logo_url, rp.city ORDER BY j.created_at DESC`,
    params
  );

  return rows;
};

export const searchJobs = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const { search, role_type, city, is_remote, status, cuisine_id, skill_id } = req.query;

  const conditions: string[] = ["j.status IN ('OPEN')"];
  const params: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(j.title ILIKE $${idx} OR j.description ILIKE $${idx} OR rp.name ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (role_type) { conditions.push(`j.role_type = $${idx++}`); params.push(role_type); }
  if (city) { conditions.push(`j.city ILIKE $${idx++}`); params.push(`%${city}%`); }
  if (is_remote !== undefined) { conditions.push(`j.is_remote = $${idx++}`); params.push(is_remote === "true"); }
  if (status && status !== "OPEN") { conditions[0] = `j.status = $${idx++}`; params.push(status); }
  if (cuisine_id) {
    conditions.push(`EXISTS (SELECT 1 FROM job_post_cuisines jpc WHERE jpc.job_id = j.id AND jpc.cuisine_id = $${idx++})`);
    params.push(cuisine_id);
  }
  if (skill_id) {
    conditions.push(`EXISTS (SELECT 1 FROM job_post_skills jps WHERE jps.job_id = j.id AND jps.skill_id = $${idx++})`);
    params.push(skill_id);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT j.id) FROM restaurant_job_posts j
     JOIN restaurant_profiles rp ON j.restaurant_id = rp.id ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const sortBy = ["created_at", "salary_min", "deadline"].includes(req.query.sortBy as string)
    ? `j.${req.query.sortBy}`
    : "j.created_at";
  const sortDir = (req.query.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  params.push(limit, offset);
  const { rows } = await pool.query(
    `${JOB_SELECT} ${where}
     GROUP BY j.id, rp.name, rp.logo_url, rp.city
     ORDER BY ${sortBy} ${sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};
