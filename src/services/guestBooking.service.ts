import { Request } from "express";
import { AppError } from "../middleware/error.middleware";
import { getPaginationParams, buildPaginationMeta } from "../utils/pagination";
import { CreateGuestBookingInput, BookingListQuery } from "../validators/guestBooking.validator";
import { BookingRequestStatus } from "../types";
import * as repo from "../repositories/guestBooking.repository";

// ── Allowed status transitions per actor ──────────────────────

const CHEF_ALLOWED_TRANSITIONS: Record<string, BookingRequestStatus[]> = {
  PENDING:  ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["COMPLETED", "CANCELLED"],
};

const HELPER_ALLOWED_TRANSITIONS: Record<string, BookingRequestStatus[]> = {
  PENDING:  ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["COMPLETED", "CANCELLED"],
};

// ── Allowed sort fields (whitelist to prevent injection) ──────

const CHEF_SORT_FIELDS: Record<string, string> = {
  hourly_rate:      "cp.hourly_rate",
  years_experience: "cp.years_experience",
  created_at:       "cp.created_at",
};

const HELPER_SORT_FIELDS: Record<string, string> = {
  hourly_rate:      "hp.hourly_rate",
  years_experience: "hp.years_experience",
  created_at:       "hp.created_at",
};

const BOOKING_SORT_FIELDS: Record<string, string> = {
  event_date:  "event_date",
  created_at:  "created_at",
  budget:      "budget",
  guest_count: "guest_count",
};

// ── Public: Browse Chefs ──────────────────────────────────────

export const browseChefs = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const q = req.query;

  const sortBy  = q.sortBy as string;
  const sortDir = (q.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { rows, total } = await repo.findChefs({
    search:         q.search  as string | undefined,
    city:           q.city    as string | undefined,
    cuisine_id:     q.cuisine_id as string | undefined,
    is_available:   q.is_available !== undefined ? q.is_available === "true" : undefined,
    min_rate:       q.min_rate    !== undefined  ? Number(q.min_rate)    : undefined,
    max_rate:       q.max_rate    !== undefined  ? Number(q.max_rate)    : undefined,
    min_experience: q.min_experience !== undefined ? Number(q.min_experience) : undefined,
    limit,
    offset,
    sortField: CHEF_SORT_FIELDS[sortBy] ?? "cp.created_at",
    sortDir:   sortDir as "ASC" | "DESC",
  });

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

// ── Public: Chef Detail ───────────────────────────────────────

export const getChefDetail = async (chefId: string) => {
  const chef = await repo.findChefById(chefId);
  if (!chef) throw new AppError("Chef not found", 404);
  return chef;
};

// ── Public: Browse Helpers ────────────────────────────────────

export const browseHelpers = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const q = req.query;

  const sortBy  = q.sortBy as string;
  const sortDir = (q.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { rows, total } = await repo.findHelpers({
    search:         q.search  as string | undefined,
    city:           q.city    as string | undefined,
    is_available:   q.is_available !== undefined ? q.is_available === "true" : undefined,
    min_rate:       q.min_rate    !== undefined  ? Number(q.min_rate)    : undefined,
    max_rate:       q.max_rate    !== undefined  ? Number(q.max_rate)    : undefined,
    min_experience: q.min_experience !== undefined ? Number(q.min_experience) : undefined,
    limit,
    offset,
    sortField: HELPER_SORT_FIELDS[sortBy] ?? "hp.created_at",
    sortDir:   sortDir as "ASC" | "DESC",
  });

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

// ── Public: Helper Detail ─────────────────────────────────────

export const getHelperDetail = async (helperId: string) => {
  const helper = await repo.findHelperById(helperId);
  if (!helper) throw new AppError("Helper not found", 404);
  return helper;
};

// ── Public: Create Guest Booking Request ──────────────────────

export const createGuestBooking = async (input: CreateGuestBookingInput) => {
  // Verify the target chef/helper exists and is active
  if (input.booking_type === "CHEF") {
    const exists = await repo.findChefProfileId(input.chef_id!);
    if (!exists) throw new AppError("Chef not found or not available", 404);
  } else {
    const exists = await repo.findHelperProfileId(input.helper_id!);
    if (!exists) throw new AppError("Helper not found or not available", 404);
  }

  const booking = await repo.insertBookingRequest(input);
  console.info(`[GuestBooking] New booking created: ${booking.id} (${booking.booking_type})`);
  return booking;
};

// ── Chef: List Own Bookings ───────────────────────────────────

export const getChefBookings = async (userId: string, req: Request) => {
  const chefProfileId = await repo.findChefProfileIdByUserId(userId);
  if (!chefProfileId) throw new AppError("Chef profile not found", 404);

  const { page, limit, offset } = getPaginationParams(req);
  const q = req.query as BookingListQuery;

  const sortBy  = q.sortBy as string;
  const sortDir = (q.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { rows, total } = await repo.findBookingsByChef({
    profileId:    chefProfileId,
    status:       q.status,
    event_type:   q.event_type,
    city:         q.city,
    from_date:    q.from_date,
    to_date:      q.to_date,
    limit,
    offset,
    sortField: BOOKING_SORT_FIELDS[sortBy] ?? "created_at",
    sortDir:   sortDir as "ASC" | "DESC",
  });

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

// ── Chef: Get Single Booking ──────────────────────────────────

export const getChefBookingById = async (userId: string, bookingId: string) => {
  const chefProfileId = await repo.findChefProfileIdByUserId(userId);
  if (!chefProfileId) throw new AppError("Chef profile not found", 404);

  const booking = await repo.findBookingByIdForChef(bookingId, chefProfileId);
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};

// ── Chef: Update Booking Status ───────────────────────────────

export const updateChefBookingStatus = async (
  userId: string,
  bookingId: string,
  newStatus: string
) => {
  const chefProfileId = await repo.findChefProfileIdByUserId(userId);
  if (!chefProfileId) throw new AppError("Chef profile not found", 404);

  const booking = await repo.findBookingByIdForChef(bookingId, chefProfileId);
  if (!booking) throw new AppError("Booking not found", 404);

  const allowed = CHEF_ALLOWED_TRANSITIONS[booking.status as string] ?? [];
  if (!allowed.includes(newStatus as BookingRequestStatus)) {
    throw new AppError(
      `Cannot transition from ${booking.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
      409
    );
  }

  const updated = await repo.updateBookingStatusByChef(bookingId, chefProfileId, newStatus);
  if (!updated) throw new AppError("Failed to update booking status", 500);

  console.info(`[GuestBooking] Chef ${userId} updated booking ${bookingId}: ${booking.status} → ${newStatus}`);
  return updated;
};

// ── Helper: List Own Bookings ─────────────────────────────────

export const getHelperBookings = async (userId: string, req: Request) => {
  const helperProfileId = await repo.findHelperProfileIdByUserId(userId);
  if (!helperProfileId) throw new AppError("Helper profile not found", 404);

  const { page, limit, offset } = getPaginationParams(req);
  const q = req.query as BookingListQuery;

  const sortBy  = q.sortBy as string;
  const sortDir = (q.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { rows, total } = await repo.findBookingsByHelper({
    profileId:    helperProfileId,
    status:       q.status,
    event_type:   q.event_type,
    city:         q.city,
    from_date:    q.from_date,
    to_date:      q.to_date,
    limit,
    offset,
    sortField: BOOKING_SORT_FIELDS[sortBy] ?? "created_at",
    sortDir:   sortDir as "ASC" | "DESC",
  });

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

// ── Helper: Get Single Booking ────────────────────────────────

export const getHelperBookingById = async (userId: string, bookingId: string) => {
  const helperProfileId = await repo.findHelperProfileIdByUserId(userId);
  if (!helperProfileId) throw new AppError("Helper profile not found", 404);

  const booking = await repo.findBookingByIdForHelper(bookingId, helperProfileId);
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};

// ── Helper: Update Booking Status ─────────────────────────────

export const updateHelperBookingStatus = async (
  userId: string,
  bookingId: string,
  newStatus: string
) => {
  const helperProfileId = await repo.findHelperProfileIdByUserId(userId);
  if (!helperProfileId) throw new AppError("Helper profile not found", 404);

  const booking = await repo.findBookingByIdForHelper(bookingId, helperProfileId);
  if (!booking) throw new AppError("Booking not found", 404);

  const allowed = HELPER_ALLOWED_TRANSITIONS[booking.status as string] ?? [];
  if (!allowed.includes(newStatus as BookingRequestStatus)) {
    throw new AppError(
      `Cannot transition from ${booking.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
      409
    );
  }

  const updated = await repo.updateBookingStatusByHelper(bookingId, helperProfileId, newStatus);
  if (!updated) throw new AppError("Failed to update booking status", 500);

  console.info(`[GuestBooking] Helper ${userId} updated booking ${bookingId}: ${booking.status} → ${newStatus}`);
  return updated;
};

// ── Admin: List All Bookings ──────────────────────────────────

export const adminListBookings = async (req: Request) => {
  const { page, limit, offset } = getPaginationParams(req);
  const q = req.query as BookingListQuery;

  const sortBy  = q.sortBy as string;
  const sortDir = (q.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { rows, total } = await repo.findAllBookings({
    status:       q.status,
    event_type:   q.event_type,
    booking_type: q.booking_type,
    city:         q.city,
    from_date:    q.from_date,
    to_date:      q.to_date,
    limit,
    offset,
    sortField: BOOKING_SORT_FIELDS[sortBy] ?? "created_at",
    sortDir:   sortDir as "ASC" | "DESC",
  });

  return { data: rows, meta: buildPaginationMeta(total, page, limit) };
};

// ── Admin: Get Single Booking ─────────────────────────────────

export const adminGetBookingById = async (bookingId: string) => {
  const booking = await repo.findBookingByIdForAdmin(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);
  return booking;
};

// ── Admin: Delete Booking ─────────────────────────────────────

export const adminDeleteBooking = async (bookingId: string) => {
  const booking = await repo.findBookingByIdForAdmin(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  const deleted = await repo.deleteBookingById(bookingId);
  if (!deleted) throw new AppError("Failed to delete booking", 500);

  console.info(`[GuestBooking] Admin deleted booking ${bookingId}`);
};

// ── Admin: Analytics ──────────────────────────────────────────

export const adminGetAnalytics = async () => {
  return repo.getAnalytics();
};
