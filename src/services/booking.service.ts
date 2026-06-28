import pool from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { CreateBookingInput, UpdateBookingStatusInput } from "../validators/event.validator";

const BOOKING_SELECT = `
  SELECT eb.*,
         e.title        AS event_title,
         e.event_date,
         e.start_time,
         e.end_time,
         e.venue,
         e.city         AS event_city,
         e.price,
         e.currency,
         u.first_name,
         u.last_name,
         u.email,
         u.phone
  FROM event_bookings eb
  JOIN events e ON e.id = eb.event_id
  JOIN users  u ON u.id = eb.user_id
`;

export const createBooking = async (
  userId: string,
  eventId: string,
  input: CreateBookingInput
) => {
  const { rows: eventRows } = await pool.query(
    "SELECT id, status, max_participants, current_participants FROM events WHERE id = $1",
    [eventId]
  );
  if (eventRows.length === 0) throw new AppError("Event not found", 404);

  const event = eventRows[0];

  if (event.status !== "OPEN")
    throw new AppError("This event is not accepting bookings", 400);

  const numberOfPeople = input.number_of_people ?? 1;
  const available = event.max_participants - event.current_participants;
  if (numberOfPeople > available)
    throw new AppError(
      `Only ${available} spot(s) remaining for this event`,
      400
    );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO event_bookings
         (event_id, user_id, number_of_people, special_request)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [eventId, userId, numberOfPeople, input.special_request ?? null]
    );

    await client.query(
      `UPDATE events
       SET current_participants = current_participants + $1, updated_at = NOW()
       WHERE id = $2`,
      [numberOfPeople, eventId]
    );

    await client.query("COMMIT");
    return getBookingById(rows[0].id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const cancelBooking = async (userId: string, bookingId: string) => {
  const { rows } = await pool.query(
    "SELECT id, event_id, number_of_people, booking_status FROM event_bookings WHERE id = $1 AND user_id = $2",
    [bookingId, userId]
  );
  if (rows.length === 0) throw new AppError("Booking not found or unauthorized", 404);

  const booking = rows[0];
  if (booking.booking_status === "CANCELLED")
    throw new AppError("Booking is already cancelled", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE event_bookings
       SET booking_status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );

    await client.query(
      `UPDATE events
       SET current_participants = GREATEST(0, current_participants - $1), updated_at = NOW()
       WHERE id = $2`,
      [booking.number_of_people, booking.event_id]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getMyBookings = async (userId: string) => {
  const { rows } = await pool.query(
    `${BOOKING_SELECT} WHERE eb.user_id = $1 ORDER BY eb.created_at DESC`,
    [userId]
  );
  return rows;
};

export const getEventBookings = async (
  restaurantUserId: string,
  eventId: string
) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const { rows: event } = await pool.query(
    "SELECT id FROM events WHERE id = $1 AND restaurant_id = $2",
    [eventId, restaurant[0].id]
  );
  if (event.length === 0) throw new AppError("Event not found or unauthorized", 404);

  const { rows } = await pool.query(
    `${BOOKING_SELECT} WHERE eb.event_id = $1 ORDER BY eb.created_at DESC`,
    [eventId]
  );
  return rows;
};

export const updateBookingStatus = async (
  restaurantUserId: string,
  bookingId: string,
  input: UpdateBookingStatusInput
) => {
  const { rows: restaurant } = await pool.query(
    "SELECT id FROM restaurant_profiles WHERE user_id = $1",
    [restaurantUserId]
  );
  if (restaurant.length === 0) throw new AppError("Restaurant profile not found", 404);

  const { rows: booking } = await pool.query(
    `SELECT eb.id, eb.event_id, eb.booking_status, eb.number_of_people
     FROM event_bookings eb
     JOIN events e ON e.id = eb.event_id
     WHERE eb.id = $1 AND e.restaurant_id = $2`,
    [bookingId, restaurant[0].id]
  );
  if (booking.length === 0) throw new AppError("Booking not found or unauthorized", 404);

  const current = booking[0];
  const wasCancelled = current.booking_status === "CANCELLED";
  const nowCancelling = input.booking_status === "CANCELLED";

  const fields: string[] = ["booking_status = $1"];
  const values: unknown[] = [input.booking_status];
  let idx = 2;

  if (input.payment_status !== undefined) {
    fields.push(`payment_status = $${idx++}`);
    values.push(input.payment_status);
  }

  values.push(bookingId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE event_bookings SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );

    // Adjust participant count when cancellation state changes
    if (!wasCancelled && nowCancelling) {
      await client.query(
        `UPDATE events
         SET current_participants = GREATEST(0, current_participants - $1), updated_at = NOW()
         WHERE id = $2`,
        [current.number_of_people, current.event_id]
      );
    } else if (wasCancelled && !nowCancelling) {
      await client.query(
        `UPDATE events
         SET current_participants = current_participants + $1, updated_at = NOW()
         WHERE id = $2`,
        [current.number_of_people, current.event_id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getBookingById(bookingId);
};

const getBookingById = async (bookingId: string) => {
  const { rows } = await pool.query(
    `${BOOKING_SELECT} WHERE eb.id = $1`,
    [bookingId]
  );
  if (rows.length === 0) throw new AppError("Booking not found", 404);
  return rows[0];
};
