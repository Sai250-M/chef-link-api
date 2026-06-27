import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { UpdateRestaurantProfileInput } from "../validators/restaurant.validator";

export const getRestaurantProfile = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT rp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
     FROM restaurant_profiles rp
     JOIN users u ON rp.user_id = u.id
     WHERE rp.user_id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );
  if (rows.length === 0) throw new AppError("Restaurant profile not found", 404);
  return rows[0];
};

export const getRestaurantProfileById = async (restaurantId: string) => {
  const { rows } = await pool.query(
    `SELECT rp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
     FROM restaurant_profiles rp
     JOIN users u ON rp.user_id = u.id
     WHERE rp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE`,
    [restaurantId]
  );
  if (rows.length === 0) throw new AppError("Restaurant profile not found", 404);
  return rows[0];
};

export const updateRestaurantProfile = async (userId: string, input: UpdateRestaurantProfileInput) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  (Object.keys(input) as (keyof UpdateRestaurantProfileInput)[]).forEach((key) => {
    if (input[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(input[key]);
    }
  });

  if (fields.length === 0) throw new AppError("No fields to update", 400);

  values.push(userId);

  const { rows } = await pool.query(
    `UPDATE restaurant_profiles SET ${fields.join(", ")}, updated_at = NOW()
     WHERE user_id = $${idx} RETURNING *`,
    values
  );

  if (rows.length === 0) throw new AppError("Restaurant profile not found", 404);
  await recalculateRestaurantCompletion(userId);
  return rows[0];
};

export const saveProfile = async (
  restaurantUserId: string,
  profileId: string,
  profileRole: string
): Promise<void> => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const { rows: user } = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL",
    [profileId]
  );
  if (user.length === 0) throw new AppError("Profile not found", 404);

  await pool.query(
    `INSERT INTO saved_profiles (restaurant_id, profile_id, profile_role)
     VALUES ($1, $2, $3)
     ON CONFLICT (restaurant_id, profile_id) DO NOTHING`,
    [restaurant[0].id, profileId, profileRole]
  );
};

export const unsaveProfile = async (restaurantUserId: string, profileId: string): Promise<void> => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  await pool.query(
    "DELETE FROM saved_profiles WHERE restaurant_id = $1 AND profile_id = $2",
    [restaurant[0].id, profileId]
  );
};

export const getSavedProfiles = async (restaurantUserId: string) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const { rows } = await pool.query(
    `SELECT sp.*, u.first_name, u.last_name, u.email, u.avatar_url, u.role
     FROM saved_profiles sp
     JOIN users u ON sp.profile_id = u.id
     WHERE sp.restaurant_id = $1 AND u.deleted_at IS NULL
     ORDER BY sp.created_at DESC`,
    [restaurant[0].id]
  );

  return rows;
};

export const getRestaurantStats = async (userId: string) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [userId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);
  const restaurantId = restaurant[0].id;

  const [jobs, apps, hired] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*) as count FROM restaurant_job_posts
       WHERE restaurant_id = $1 GROUP BY status`,
      [restaurantId]
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM applications a
       JOIN restaurant_job_posts j ON a.job_id = j.id
       WHERE j.restaurant_id = $1`,
      [restaurantId]
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM assignments WHERE restaurant_id = $1 AND status = 'ACTIVE'`,
      [restaurantId]
    ),
  ]);

  const jobsByStatus: Record<string, number> = {};
  jobs.rows.forEach((r) => { jobsByStatus[r.status] = parseInt(r.count, 10); });

  return {
    totalJobs: jobs.rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0),
    activeJobs: jobsByStatus["OPEN"] || 0,
    totalApplications: parseInt(apps.rows[0].total, 10),
    hiredStaff: parseInt(hired.rows[0].total, 10),
    jobsByStatus,
  };
};

const recalculateRestaurantCompletion = async (userId: string): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT rp.name, rp.description, rp.cuisine_type, rp.address, rp.city, rp.website, rp.logo_url,
            u.phone
     FROM restaurant_profiles rp JOIN users u ON rp.user_id = u.id
     WHERE rp.user_id = $1`,
    [userId]
  );

  if (rows.length === 0) return;
  const p = rows[0];

  const checks = [
    !!p.name && p.name !== "My Restaurant",
    !!p.description,
    !!p.cuisine_type,
    !!p.address,
    !!p.city,
    !!p.website,
    !!p.logo_url,
    !!p.phone,
  ];

  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  await pool.query(
    "UPDATE restaurant_profiles SET profile_completion_pct = $1 WHERE user_id = $2",
    [pct, userId]
  );
};
