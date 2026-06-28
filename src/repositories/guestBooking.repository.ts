import pool from "../config/db";
import { CreateGuestBookingInput } from "../validators/guestBooking.validator";

// ── Public: Browse Chefs ──────────────────────────────────────

export interface BrowseChefsOptions {
  search?: string;
  city?: string;
  cuisine_id?: string;
  is_available?: boolean;
  min_rate?: number;
  max_rate?: number;
  min_experience?: number;
  limit: number;
  offset: number;
  sortField: string;
  sortDir: "ASC" | "DESC";
}

export const findChefs = async (opts: BrowseChefsOptions) => {
  const conditions: string[] = [
    "u.deleted_at IS NULL",
    "u.is_active = TRUE",
    "u.role = 'ROLE_CHEF'",
  ];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.search) {
    conditions.push(
      `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR cp.specialization ILIKE $${idx} OR cp.bio ILIKE $${idx})`
    );
    params.push(`%${opts.search}%`);
    idx++;
  }
  if (opts.city) {
    conditions.push(`cp.city ILIKE $${idx++}`);
    params.push(`%${opts.city}%`);
  }
  if (opts.is_available !== undefined) {
    conditions.push(`cp.is_available = $${idx++}`);
    params.push(opts.is_available);
  }
  if (opts.min_rate !== undefined) {
    conditions.push(`cp.hourly_rate >= $${idx++}`);
    params.push(opts.min_rate);
  }
  if (opts.max_rate !== undefined) {
    conditions.push(`cp.hourly_rate <= $${idx++}`);
    params.push(opts.max_rate);
  }
  if (opts.min_experience !== undefined) {
    conditions.push(`cp.years_experience >= $${idx++}`);
    params.push(opts.min_experience);
  }
  if (opts.cuisine_id) {
    conditions.push(
      `EXISTS (SELECT 1 FROM chef_cuisines cc2 WHERE cc2.chef_id = cp.id AND cc2.cuisine_id = $${idx++})`
    );
    params.push(opts.cuisine_id);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT cp.id)
     FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query(
    `SELECT cp.id, cp.bio, cp.years_experience, cp.specialization, cp.hourly_rate,
            cp.currency, cp.is_available, cp.city, cp.state, cp.country,
            cp.profile_completion_pct,
            u.first_name, u.last_name, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
              FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS cuisines
     FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN chef_cuisines cc ON cc.chef_id = cp.id
     LEFT JOIN cuisines c ON c.id = cc.cuisine_id
     ${where}
     GROUP BY cp.id, cp.bio, cp.years_experience, cp.specialization, cp.hourly_rate,
              cp.currency, cp.is_available, cp.city, cp.state, cp.country,
              cp.profile_completion_pct, u.first_name, u.last_name, u.avatar_url
     ORDER BY ${opts.sortField} ${opts.sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { rows, total };
};

// ── Public: Chef Detail ───────────────────────────────────────

export const findChefById = async (chefId: string) => {
  const { rows } = await pool.query(
    `SELECT cp.*, u.first_name, u.last_name, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
              FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS cuisines,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object(
                'id', cert.id, 'title', cert.title,
                'issuer', cert.issuer, 'issued_year', cert.issued_year, 'file_url', cert.file_url
              )) FILTER (WHERE cert.id IS NOT NULL), '[]'
            ) AS certificates
     FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN chef_cuisines cc ON cc.chef_id = cp.id
     LEFT JOIN cuisines c ON c.id = cc.cuisine_id
     LEFT JOIN chef_certificates cert ON cert.chef_id = cp.id
     WHERE cp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE
     GROUP BY cp.id, u.first_name, u.last_name, u.avatar_url`,
    [chefId]
  );
  return rows[0] ?? null;
};

// ── Public: Browse Helpers ────────────────────────────────────

export interface BrowseHelpersOptions {
  search?: string;
  city?: string;
  is_available?: boolean;
  min_rate?: number;
  max_rate?: number;
  min_experience?: number;
  limit: number;
  offset: number;
  sortField: string;
  sortDir: "ASC" | "DESC";
}

export const findHelpers = async (opts: BrowseHelpersOptions) => {
  const conditions: string[] = [
    "u.deleted_at IS NULL",
    "u.is_active = TRUE",
    "u.role = 'ROLE_HELPER'",
  ];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.search) {
    conditions.push(
      `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR hp.bio ILIKE $${idx})`
    );
    params.push(`%${opts.search}%`);
    idx++;
  }
  if (opts.city) {
    conditions.push(`hp.city ILIKE $${idx++}`);
    params.push(`%${opts.city}%`);
  }
  if (opts.is_available !== undefined) {
    conditions.push(`hp.is_available = $${idx++}`);
    params.push(opts.is_available);
  }
  if (opts.min_rate !== undefined) {
    conditions.push(`hp.hourly_rate >= $${idx++}`);
    params.push(opts.min_rate);
  }
  if (opts.max_rate !== undefined) {
    conditions.push(`hp.hourly_rate <= $${idx++}`);
    params.push(opts.max_rate);
  }
  if (opts.min_experience !== undefined) {
    conditions.push(`hp.years_experience >= $${idx++}`);
    params.push(opts.min_experience);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT hp.id)
     FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query(
    `SELECT hp.id, hp.bio, hp.years_experience, hp.hourly_rate, hp.currency,
            hp.is_available, hp.city, hp.state, hp.country, hp.profile_completion_pct,
            u.first_name, u.last_name, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object(
                'id', s.id, 'name', s.name, 'slug', s.slug, 'category', s.category,
                'proficiency_level', hs.proficiency_level
              )) FILTER (WHERE s.id IS NOT NULL), '[]'
            ) AS skills
     FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     LEFT JOIN helper_skills hs ON hs.helper_id = hp.id
     LEFT JOIN skills s ON s.id = hs.skill_id
     ${where}
     GROUP BY hp.id, hp.bio, hp.years_experience, hp.hourly_rate, hp.currency,
              hp.is_available, hp.city, hp.state, hp.country, hp.profile_completion_pct,
              u.first_name, u.last_name, u.avatar_url
     ORDER BY ${opts.sortField} ${opts.sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { rows, total };
};

// ── Public: Helper Detail ─────────────────────────────────────

export const findHelperById = async (helperId: string) => {
  const { rows } = await pool.query(
    `SELECT hp.*, u.first_name, u.last_name, u.avatar_url,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object(
                'id', s.id, 'name', s.name, 'slug', s.slug, 'category', s.category,
                'proficiency_level', hs.proficiency_level
              )) FILTER (WHERE s.id IS NOT NULL), '[]'
            ) AS skills
     FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     LEFT JOIN helper_skills hs ON hs.helper_id = hp.id
     LEFT JOIN skills s ON s.id = hs.skill_id
     WHERE hp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE
     GROUP BY hp.id, u.first_name, u.last_name, u.avatar_url`,
    [helperId]
  );
  return rows[0] ?? null;
};

// ── Create Booking Request ────────────────────────────────────

export const insertBookingRequest = async (input: CreateGuestBookingInput) => {
  const {
    booking_type, chef_id = null, helper_id = null,
    guest_name, guest_email, guest_phone,
    event_type, event_date, start_time, end_time,
    guest_count, budget, currency = "INR",
    location = null, address = null, city = null,
    state = null, country = "India", special_requirements = null,
  } = input;

  const { rows } = await pool.query(
    `INSERT INTO booking_requests (
       chef_id, helper_id, booking_type,
       guest_name, guest_email, guest_phone,
       event_type, event_date, start_time, end_time,
       guest_count, budget, currency,
       location, address, city, state, country,
       special_requirements
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17, $18, $19
     ) RETURNING *`,
    [
      chef_id, helper_id, booking_type,
      guest_name, guest_email, guest_phone,
      event_type, event_date, start_time, end_time,
      guest_count, budget, currency,
      location, address, city, state, country,
      special_requirements,
    ]
  );
  return rows[0];
};

// ── Verify Chef/Helper Exists and Is Active ───────────────────

export const findChefProfileId = async (chefId: string): Promise<string | null> => {
  const { rows } = await pool.query(
    `SELECT cp.id FROM chef_profiles cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE`,
    [chefId]
  );
  return rows[0]?.id ?? null;
};

export const findHelperProfileId = async (helperId: string): Promise<string | null> => {
  const { rows } = await pool.query(
    `SELECT hp.id FROM helper_profiles hp
     JOIN users u ON hp.user_id = u.id
     WHERE hp.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE`,
    [helperId]
  );
  return rows[0]?.id ?? null;
};

// ── Get Chef Profile ID from User ID ─────────────────────────

export const findChefProfileIdByUserId = async (userId: string): Promise<string | null> => {
  const { rows } = await pool.query(
    "SELECT id FROM chef_profiles WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.id ?? null;
};

export const findHelperProfileIdByUserId = async (userId: string): Promise<string | null> => {
  const { rows } = await pool.query(
    "SELECT id FROM helper_profiles WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.id ?? null;
};

// ── Chef: List Own Bookings ───────────────────────────────────

export interface ListBookingsOptions {
  profileId: string;
  status?: string;
  event_type?: string;
  city?: string;
  from_date?: string;
  to_date?: string;
  booking_type?: string;
  limit: number;
  offset: number;
  sortField: string;
  sortDir: "ASC" | "DESC";
}

export const findBookingsByChef = async (opts: ListBookingsOptions) => {
  const conditions: string[] = ["br.chef_id = $1"];
  const params: unknown[] = [opts.profileId];
  let idx = 2;

  if (opts.status)     { conditions.push(`br.status = $${idx++}`);     params.push(opts.status); }
  if (opts.event_type) { conditions.push(`br.event_type = $${idx++}`); params.push(opts.event_type); }
  if (opts.city)       { conditions.push(`br.city ILIKE $${idx++}`);   params.push(`%${opts.city}%`); }
  if (opts.from_date)  { conditions.push(`br.event_date >= $${idx++}`); params.push(opts.from_date); }
  if (opts.to_date)    { conditions.push(`br.event_date <= $${idx++}`); params.push(opts.to_date); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM booking_requests br ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query(
    `SELECT br.*
     FROM booking_requests br
     ${where}
     ORDER BY br.${opts.sortField} ${opts.sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { rows, total };
};

// ── Chef: Single Booking ──────────────────────────────────────

export const findBookingByIdForChef = async (bookingId: string, chefProfileId: string) => {
  const { rows } = await pool.query(
    `SELECT br.* FROM booking_requests br
     WHERE br.id = $1 AND br.chef_id = $2`,
    [bookingId, chefProfileId]
  );
  return rows[0] ?? null;
};

// ── Chef: Update Booking Status ───────────────────────────────

export const updateBookingStatusByChef = async (
  bookingId: string,
  chefProfileId: string,
  status: string
) => {
  const { rows } = await pool.query(
    `UPDATE booking_requests
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND chef_id = $3
     RETURNING *`,
    [status, bookingId, chefProfileId]
  );
  return rows[0] ?? null;
};

// ── Helper: List Own Bookings ─────────────────────────────────

export const findBookingsByHelper = async (opts: ListBookingsOptions) => {
  const conditions: string[] = ["br.helper_id = $1"];
  const params: unknown[] = [opts.profileId];
  let idx = 2;

  if (opts.status)     { conditions.push(`br.status = $${idx++}`);     params.push(opts.status); }
  if (opts.event_type) { conditions.push(`br.event_type = $${idx++}`); params.push(opts.event_type); }
  if (opts.city)       { conditions.push(`br.city ILIKE $${idx++}`);   params.push(`%${opts.city}%`); }
  if (opts.from_date)  { conditions.push(`br.event_date >= $${idx++}`); params.push(opts.from_date); }
  if (opts.to_date)    { conditions.push(`br.event_date <= $${idx++}`); params.push(opts.to_date); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM booking_requests br ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query(
    `SELECT br.*
     FROM booking_requests br
     ${where}
     ORDER BY br.${opts.sortField} ${opts.sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { rows, total };
};

// ── Helper: Single Booking ────────────────────────────────────

export const findBookingByIdForHelper = async (bookingId: string, helperProfileId: string) => {
  const { rows } = await pool.query(
    `SELECT br.* FROM booking_requests br
     WHERE br.id = $1 AND br.helper_id = $2`,
    [bookingId, helperProfileId]
  );
  return rows[0] ?? null;
};

// ── Helper: Update Booking Status ─────────────────────────────

export const updateBookingStatusByHelper = async (
  bookingId: string,
  helperProfileId: string,
  status: string
) => {
  const { rows } = await pool.query(
    `UPDATE booking_requests
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND helper_id = $3
     RETURNING *`,
    [status, bookingId, helperProfileId]
  );
  return rows[0] ?? null;
};

// ── Admin: List All Bookings ──────────────────────────────────

export interface AdminListBookingsOptions {
  status?: string;
  event_type?: string;
  booking_type?: string;
  city?: string;
  from_date?: string;
  to_date?: string;
  limit: number;
  offset: number;
  sortField: string;
  sortDir: "ASC" | "DESC";
}

export const findAllBookings = async (opts: AdminListBookingsOptions) => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.status)       { conditions.push(`br.status = $${idx++}`);       params.push(opts.status); }
  if (opts.event_type)   { conditions.push(`br.event_type = $${idx++}`);   params.push(opts.event_type); }
  if (opts.booking_type) { conditions.push(`br.booking_type = $${idx++}`); params.push(opts.booking_type); }
  if (opts.city)         { conditions.push(`br.city ILIKE $${idx++}`);     params.push(`%${opts.city}%`); }
  if (opts.from_date)    { conditions.push(`br.event_date >= $${idx++}`);  params.push(opts.from_date); }
  if (opts.to_date)      { conditions.push(`br.event_date <= $${idx++}`);  params.push(opts.to_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM booking_requests br ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(opts.limit, opts.offset);
  const { rows } = await pool.query(
    `SELECT br.*,
            CASE WHEN br.chef_id IS NOT NULL
              THEN jsonb_build_object(
                'id', cp.id,
                'first_name', cu.first_name,
                'last_name', cu.last_name,
                'avatar_url', cu.avatar_url
              )
              ELSE NULL
            END AS chef,
            CASE WHEN br.helper_id IS NOT NULL
              THEN jsonb_build_object(
                'id', hp.id,
                'first_name', hu.first_name,
                'last_name', hu.last_name,
                'avatar_url', hu.avatar_url
              )
              ELSE NULL
            END AS helper
     FROM booking_requests br
     LEFT JOIN chef_profiles cp    ON br.chef_id   = cp.id
     LEFT JOIN users cu            ON cp.user_id   = cu.id
     LEFT JOIN helper_profiles hp  ON br.helper_id = hp.id
     LEFT JOIN users hu            ON hp.user_id   = hu.id
     ${where}
     ORDER BY br.${opts.sortField} ${opts.sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { rows, total };
};

// ── Admin: Single Booking ─────────────────────────────────────

export const findBookingByIdForAdmin = async (bookingId: string) => {
  const { rows } = await pool.query(
    `SELECT br.*,
            CASE WHEN br.chef_id IS NOT NULL
              THEN jsonb_build_object(
                'id', cp.id,
                'first_name', cu.first_name,
                'last_name', cu.last_name,
                'avatar_url', cu.avatar_url,
                'specialization', cp.specialization,
                'hourly_rate', cp.hourly_rate,
                'city', cp.city
              )
              ELSE NULL
            END AS chef,
            CASE WHEN br.helper_id IS NOT NULL
              THEN jsonb_build_object(
                'id', hp.id,
                'first_name', hu.first_name,
                'last_name', hu.last_name,
                'avatar_url', hu.avatar_url,
                'hourly_rate', hp.hourly_rate,
                'city', hp.city
              )
              ELSE NULL
            END AS helper
     FROM booking_requests br
     LEFT JOIN chef_profiles cp    ON br.chef_id   = cp.id
     LEFT JOIN users cu            ON cp.user_id   = cu.id
     LEFT JOIN helper_profiles hp  ON br.helper_id = hp.id
     LEFT JOIN users hu            ON hp.user_id   = hu.id
     WHERE br.id = $1`,
    [bookingId]
  );
  return rows[0] ?? null;
};

// ── Admin: Delete Booking ─────────────────────────────────────

export const deleteBookingById = async (bookingId: string): Promise<boolean> => {
  const { rowCount } = await pool.query(
    "DELETE FROM booking_requests WHERE id = $1",
    [bookingId]
  );
  return (rowCount ?? 0) > 0;
};

// ── Admin: Update Booking Status ──────────────────────────────

export const updateBookingStatusByAdmin = async (bookingId: string, status: string) => {
  const { rows } = await pool.query(
    `UPDATE booking_requests SET status = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [status, bookingId]
  );
  return rows[0] ?? null;
};

// ── Admin: Analytics ──────────────────────────────────────────

export const getAnalytics = async () => {
  const [perMonth, byEvent, byCity, topChefs, topHelpers, statusSummary] = await Promise.all([
    pool.query<{ month: string; count: string }>(
      `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
              COUNT(*) AS count
       FROM booking_requests
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at) DESC
       LIMIT 12`
    ),

    pool.query<{ event_type: string; count: string }>(
      `SELECT event_type, COUNT(*) AS count
       FROM booking_requests
       GROUP BY event_type
       ORDER BY count DESC`
    ),

    pool.query<{ city: string; count: string }>(
      `SELECT city, COUNT(*) AS count
       FROM booking_requests
       WHERE city IS NOT NULL AND city <> ''
       GROUP BY city
       ORDER BY count DESC
       LIMIT 10`
    ),

    pool.query<{ id: string; first_name: string; last_name: string; booking_count: string }>(
      `SELECT cp.id, u.first_name, u.last_name, COUNT(*) AS booking_count
       FROM booking_requests br
       JOIN chef_profiles cp ON br.chef_id = cp.id
       JOIN users u ON cp.user_id = u.id
       GROUP BY cp.id, u.first_name, u.last_name
       ORDER BY booking_count DESC
       LIMIT 5`
    ),

    pool.query<{ id: string; first_name: string; last_name: string; booking_count: string }>(
      `SELECT hp.id, u.first_name, u.last_name, COUNT(*) AS booking_count
       FROM booking_requests br
       JOIN helper_profiles hp ON br.helper_id = hp.id
       JOIN users u ON hp.user_id = u.id
       GROUP BY hp.id, u.first_name, u.last_name
       ORDER BY booking_count DESC
       LIMIT 5`
    ),

    pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count
       FROM booking_requests
       GROUP BY status`
    ),
  ]);

  return {
    bookings_per_month: perMonth.rows.map((r) => ({ month: r.month, count: parseInt(r.count, 10) })),
    bookings_by_event:  byEvent.rows.map((r) => ({ event_type: r.event_type, count: parseInt(r.count, 10) })),
    bookings_by_city:   byCity.rows.map((r) => ({ city: r.city, count: parseInt(r.count, 10) })),
    most_booked_chefs:  topChefs.rows.map((r) => ({ ...r, booking_count: parseInt(r.booking_count, 10) })),
    most_booked_helpers: topHelpers.rows.map((r) => ({ ...r, booking_count: parseInt(r.booking_count, 10) })),
    status_summary:     statusSummary.rows.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
  };
};
