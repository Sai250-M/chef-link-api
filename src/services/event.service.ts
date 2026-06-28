import { Request } from "express";
import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { CreateEventInput, UpdateEventInput } from "../validators/event.validator";
import { getPaginationParams, buildPaginationMeta } from "../utils/pagination";

const EVENT_SELECT = `
  SELECT e.*,
         rp.name      AS restaurant_name,
         rp.logo_url  AS restaurant_logo,
         rp.city      AS restaurant_city,
         COALESCE(
           json_agg(
             jsonb_build_object('id', eg.id, 'image_url', eg.image_url)
           ) FILTER (WHERE eg.id IS NOT NULL), '[]'
         ) AS gallery
  FROM events e
  JOIN restaurant_profiles rp ON rp.id = e.restaurant_id
  LEFT JOIN event_gallery eg  ON eg.event_id = e.id
`;

const GROUP_BY = `GROUP BY e.id, rp.name, rp.logo_url, rp.city`;

const getRestaurantId = async (userId: string): Promise<string> => {
  const { rows } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) throw new AppError("Restaurant profile not found", 404);
  return rows[0].id;
};

export const createEvent = async (userId: string, input: CreateEventInput) => {
  const restaurantId = await getRestaurantId(userId);

  const { rows } = await pool.query(
    `INSERT INTO events
       (restaurant_id, title, description, event_type, event_date, start_time, end_time,
        venue, address, city, state, country, max_participants, price, currency,
        banner_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      restaurantId,
      input.title,
      input.description ?? null,
      input.event_type ?? null,
      input.event_date,
      input.start_time,
      input.end_time,
      input.venue,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.country ?? "India",
      input.max_participants,
      input.price ?? 0,
      input.currency ?? "INR",
      input.banner_url ?? null,
      input.status ?? "DRAFT",
    ]
  );

  return getEventById(rows[0].id);
};

export const updateEvent = async (
  userId: string,
  eventId: string,
  input: UpdateEventInput
) => {
  const restaurantId = await getRestaurantId(userId);

  const { rows: existing } = await pool.query(
    "SELECT id FROM events WHERE id = $1 AND restaurant_id = $2",
    [eventId, restaurantId]
  );
  if (existing.length === 0) throw new AppError("Event not found or unauthorized", 404);

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  (Object.keys(input) as (keyof typeof input)[]).forEach((key) => {
    if (input[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(input[key]);
    }
  });

  if (fields.length === 0) throw new AppError("No fields provided to update", 400);

  values.push(eventId);
  await pool.query(
    `UPDATE events SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
    values
  );

  return getEventById(eventId);
};

export const deleteEvent = async (userId: string, eventId: string) => {
  const restaurantId = await getRestaurantId(userId);

  const { rowCount } = await pool.query(
    "DELETE FROM events WHERE id = $1 AND restaurant_id = $2",
    [eventId, restaurantId]
  );
  if (!rowCount || rowCount === 0)
    throw new AppError("Event not found or unauthorized", 404);
};

export const getEventById = async (eventId: string) => {
  const { rows } = await pool.query(
    `${EVENT_SELECT} WHERE e.id = $1 ${GROUP_BY}`,
    [eventId]
  );
  if (rows.length === 0) throw new AppError("Event not found", 404);
  return rows[0];
};

export const getMyEvents = async (userId: string, status?: string) => {
  const restaurantId = await getRestaurantId(userId);

  const params: unknown[] = [restaurantId];
  let where = "WHERE e.restaurant_id = $1";

  if (status) {
    where += " AND e.status = $2";
    params.push(status);
  }

  const { rows } = await pool.query(
    `${EVENT_SELECT} ${where} ${GROUP_BY} ORDER BY e.event_date DESC`,
    params
  );

  return rows;
};

export const searchEvents = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const { search, city, event_date, event_type, status } = req.query;

  const conditions: string[] = ["e.status = 'OPEN'"];
  const params: unknown[] = [];
  let idx = 1;

  if (status && status !== "OPEN") {
    conditions[0] = `e.status = $${idx++}`;
    params.push(status);
  }

  if (search) {
    conditions.push(
      `(e.title ILIKE $${idx} OR e.description ILIKE $${idx} OR rp.name ILIKE $${idx})`
    );
    params.push(`%${search}%`);
    idx++;
  }

  if (city) {
    conditions.push(`e.city ILIKE $${idx++}`);
    params.push(`%${city}%`);
  }

  if (event_date) {
    conditions.push(`e.event_date = $${idx++}`);
    params.push(event_date);
  }

  if (event_type) {
    conditions.push(`e.event_type ILIKE $${idx++}`);
    params.push(`%${event_type}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT e.id)
     FROM events e
     JOIN restaurant_profiles rp ON rp.id = e.restaurant_id
     ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const sortBy = ["event_date", "price", "created_at"].includes(
    req.query.sortBy as string
  )
    ? `e.${req.query.sortBy}`
    : "e.event_date";
  const sortDir =
    (req.query.sortDir as string)?.toUpperCase() === "DESC" ? "DESC" : "ASC";

  params.push(limit, offset);
  const { rows } = await pool.query(
    `${EVENT_SELECT} ${where}
     ${GROUP_BY}
     ORDER BY ${sortBy} ${sortDir}
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};
