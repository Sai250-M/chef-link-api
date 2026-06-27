import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { getPaginationParams, buildPaginationMeta } from "../utils/pagination";
import { Request } from "express";

export const applyForJob = async (
  jobId: string,
  applicantId: string,
  applicantRole: string,
  coverLetter?: string
) => {
  const { rows: job } = await pool.query(
    "SELECT id, status, role_type FROM restaurant_job_posts WHERE id = $1",
    [jobId]
  );
  if (job.length === 0) throw new AppError("Job post not found", 404);
  if (job[0].status !== "OPEN") throw new AppError("This job is no longer accepting applications", 400);

  const jobRoleType = job[0].role_type;
  if (
    (applicantRole === "ROLE_CHEF" && jobRoleType === "HELPER") ||
    (applicantRole === "ROLE_HELPER" && jobRoleType === "CHEF")
  ) {
    throw new AppError("Your role does not match the job requirements", 400);
  }

  const { rows: existing } = await pool.query(
    "SELECT id FROM applications WHERE job_id = $1 AND applicant_id = $2",
    [jobId, applicantId]
  );
  if (existing.length > 0) throw new AppError("You have already applied for this job", 409);

  const { rows } = await pool.query(
    `INSERT INTO applications (job_id, applicant_id, applicant_role, cover_letter)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [jobId, applicantId, applicantRole, coverLetter || null]
  );

  // Notification to restaurant
  try {
    const { rows: jobDetails } = await pool.query(
      `SELECT j.title, rp.user_id FROM restaurant_job_posts j
       JOIN restaurant_profiles rp ON j.restaurant_id = rp.id WHERE j.id = $1`,
      [jobId]
    );
    if (jobDetails.length > 0) {
      const { rows: applicant } = await pool.query(
        "SELECT first_name, last_name FROM users WHERE id = $1",
        [applicantId]
      );
      const name = applicant.length > 0 ? `${applicant[0].first_name} ${applicant[0].last_name}` : "Someone";
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'APPLICATION', $2, $3, $4)`,
        [
          jobDetails[0].user_id,
          "New Application Received",
          `${name} applied for "${jobDetails[0].title}"`,
          JSON.stringify({ job_id: jobId, application_id: rows[0].id }),
        ]
      );
    }
  } catch (e) {
    // notification failure should not break the main flow
    console.error("Notification error:", e);
  }

  return rows[0];
};

export const withdrawApplication = async (applicantId: string, applicationId: string) => {
  const { rows } = await pool.query(
    "SELECT id, status FROM applications WHERE id = $1 AND applicant_id = $2",
    [applicationId, applicantId]
  );
  if (rows.length === 0) throw new AppError("Application not found", 404);
  if (["HIRED", "REJECTED"].includes(rows[0].status)) {
    throw new AppError("Cannot withdraw a processed application", 400);
  }

  await pool.query(
    "UPDATE applications SET status = 'WITHDRAWN', updated_at = NOW() WHERE id = $1",
    [applicationId]
  );
};

export const getMyApplications = async (req: Request, applicantId: string) => {
  const { page, limit, offset } = getPaginationParams(req);
  const { status } = req.query;

  const params: unknown[] = [applicantId];
  let where = "WHERE a.applicant_id = $1";
  let idx = 2;

  if (status) {
    where += ` AND a.status = $${idx++}`;
    params.push(status as string);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM applications a ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT a.*, j.title AS job_title, j.role_type, j.salary_min, j.salary_max,
            j.salary_type, j.city AS job_city, j.deadline,
            rp.name AS restaurant_name, rp.logo_url AS restaurant_logo
     FROM applications a
     JOIN restaurant_job_posts j ON a.job_id = j.id
     JOIN restaurant_profiles rp ON j.restaurant_id = rp.id
     ${where}
     ORDER BY a.applied_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

export const getJobApplications = async (
  restaurantUserId: string,
  jobId: string,
  req: Request
) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant not found", 404);

  const { rows: job } = await pool.query(
    "SELECT id FROM restaurant_job_posts WHERE id = $1 AND restaurant_id = $2",
    [jobId, restaurant[0].id]
  );
  if (job.length === 0) throw new AppError("Job not found or unauthorized", 404);

  const { page, limit, offset } = getPaginationParams(req);
  const { status } = req.query;

  const params: unknown[] = [jobId];
  let where = "WHERE a.job_id = $1";
  let idx = 2;

  if (status) {
    where += ` AND a.status = $${idx++}`;
    params.push(status as string);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM applications a ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT a.*,
            u.first_name, u.last_name, u.email, u.avatar_url, u.phone,
            CASE
              WHEN u.role = 'ROLE_CHEF' THEN
                (SELECT json_build_object('years_experience', cp.years_experience,
                  'specialization', cp.specialization, 'hourly_rate', cp.hourly_rate,
                  'profile_completion_pct', cp.profile_completion_pct)
                 FROM chef_profiles cp WHERE cp.user_id = u.id)
              WHEN u.role = 'ROLE_HELPER' THEN
                (SELECT json_build_object('years_experience', hp.years_experience,
                  'hourly_rate', hp.hourly_rate,
                  'profile_completion_pct', hp.profile_completion_pct)
                 FROM helper_profiles hp WHERE hp.user_id = u.id)
            END AS profile_summary
     FROM applications a
     JOIN users u ON a.applicant_id = u.id
     ${where}
     ORDER BY a.applied_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

export const updateApplicationStatus = async (
  restaurantUserId: string,
  applicationId: string,
  status: string
) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant not found", 404);

  const { rows: app } = await pool.query(
    `SELECT a.id, a.applicant_id, a.status, j.title
     FROM applications a
     JOIN restaurant_job_posts j ON a.job_id = j.id
     WHERE a.id = $1 AND j.restaurant_id = $2`,
    [applicationId, restaurant[0].id]
  );

  if (app.length === 0) throw new AppError("Application not found or unauthorized", 404);
  if (app[0].status === "WITHDRAWN") throw new AppError("Cannot update a withdrawn application", 400);

  const { rows } = await pool.query(
    "UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, applicationId]
  );

  // Notify applicant
  try {
    const messages: Record<string, string> = {
      SHORTLISTED: `You've been shortlisted for "${app[0].title}"`,
      HIRED: `Congratulations! You've been hired for "${app[0].title}"`,
      REJECTED: `Your application for "${app[0].title}" was not selected`,
    };
    const types: Record<string, string> = {
      SHORTLISTED: "SHORTLISTED",
      HIRED: "HIRED",
      REJECTED: "APPLICATION",
    };
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        app[0].applicant_id,
        types[status] || "APPLICATION",
        `Application ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        messages[status] || `Application status updated to ${status}`,
        JSON.stringify({ application_id: applicationId }),
      ]
    );
  } catch (e) {
    console.error("Notification error:", e);
  }

  return rows[0];
};

export const getNotifications = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
};

export const markNotificationsRead = async (userId: string, notificationIds?: string[]) => {
  if (notificationIds && notificationIds.length > 0) {
    const placeholders = notificationIds.map((_, i) => `$${i + 2}`).join(", ");
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id IN (${placeholders})`,
      [userId, ...notificationIds]
    );
  } else {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [userId]);
  }
};
