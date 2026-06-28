import { Request, Response } from "express";
import * as guestBookingService from "../services/guestBooking.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

// ─────────────────────────────────────────────────────────────
// PUBLIC — no authentication required
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /public/chefs:
 *   get:
 *     tags: [Public]
 *     summary: Browse available chefs
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: cuisine_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: is_available
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: min_rate
 *         schema: { type: number }
 *       - in: query
 *         name: max_rate
 *         schema: { type: number }
 *       - in: query
 *         name: min_experience
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [hourly_rate, years_experience, created_at] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [ASC, DESC] }
 *     responses:
 *       200:
 *         description: Paginated list of chefs
 */
export const browseChefs = asyncHandler(async (req: Request, res: Response) => {
  const result = await guestBookingService.browseChefs(req);
  sendSuccess(res, "Chefs fetched successfully", result.data, 200, result.meta);
});

/**
 * @swagger
 * /public/chefs/{id}:
 *   get:
 *     tags: [Public]
 *     summary: Get chef profile with cuisines, certificates, and availability
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chef detail
 *       404:
 *         description: Chef not found
 */
export const getChefDetail = asyncHandler(async (req: Request, res: Response) => {
  const chef = await guestBookingService.getChefDetail(req.params.id as string);
  sendSuccess(res, "Chef profile fetched successfully", chef);
});

/**
 * @swagger
 * /public/helpers:
 *   get:
 *     tags: [Public]
 *     summary: Browse available helpers
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: is_available
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: min_rate
 *         schema: { type: number }
 *       - in: query
 *         name: max_rate
 *         schema: { type: number }
 *       - in: query
 *         name: min_experience
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [hourly_rate, years_experience, created_at] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [ASC, DESC] }
 *     responses:
 *       200:
 *         description: Paginated list of helpers
 */
export const browseHelpers = asyncHandler(async (req: Request, res: Response) => {
  const result = await guestBookingService.browseHelpers(req);
  sendSuccess(res, "Helpers fetched successfully", result.data, 200, result.meta);
});

/**
 * @swagger
 * /public/helpers/{id}:
 *   get:
 *     tags: [Public]
 *     summary: Get helper profile with skills and availability
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Helper detail
 *       404:
 *         description: Helper not found
 */
export const getHelperDetail = asyncHandler(async (req: Request, res: Response) => {
  const helper = await guestBookingService.getHelperDetail(req.params.id as string);
  sendSuccess(res, "Helper profile fetched successfully", helper);
});

/**
 * @swagger
 * /public/bookings:
 *   post:
 *     tags: [Public]
 *     summary: Submit a guest event booking request (no account required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_type, guest_name, guest_email, guest_phone, event_type, event_date, start_time, end_time, guest_count, budget]
 *             properties:
 *               booking_type:         { type: string, enum: [CHEF, HELPER] }
 *               chef_id:              { type: string, format: uuid }
 *               helper_id:            { type: string, format: uuid }
 *               guest_name:           { type: string }
 *               guest_email:          { type: string, format: email }
 *               guest_phone:          { type: string }
 *               event_type:           { type: string, enum: [BIRTHDAY, WEDDING, HOUSEWARMING, ANNIVERSARY, BABY_SHOWER, CORPORATE_EVENT, PRIVATE_PARTY, LIVE_COOKING, FESTIVAL, OTHER] }
 *               event_date:           { type: string, format: date }
 *               start_time:           { type: string, example: "18:00" }
 *               end_time:             { type: string, example: "22:00" }
 *               guest_count:          { type: integer, minimum: 1 }
 *               budget:               { type: number, minimum: 0.01 }
 *               currency:             { type: string, example: "INR" }
 *               location:             { type: string }
 *               address:              { type: string }
 *               city:                 { type: string }
 *               state:                { type: string }
 *               country:              { type: string }
 *               special_requirements: { type: string }
 *     responses:
 *       201:
 *         description: Booking request created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Chef or helper not found
 */
export const createGuestBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await guestBookingService.createGuestBooking(req.body);
  sendCreated(res, "Booking request submitted successfully", booking);
});

// ─────────────────────────────────────────────────────────────
// CHEF — authentication required, ROLE_CHEF
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /chef/bookings:
 *   get:
 *     tags: [Chef]
 *     summary: List booking requests directed to the authenticated chef
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED] }
 *       - in: query
 *         name: event_type
 *         schema: { type: string }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [event_date, created_at, budget, guest_count] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [ASC, DESC] }
 *     responses:
 *       200:
 *         description: Paginated list of bookings
 *       401:
 *         description: Unauthorized
 */
export const chefListBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await guestBookingService.getChefBookings(req.user!.userId, req);
  sendSuccess(res, "Bookings fetched successfully", result.data, 200, result.meta);
});

/**
 * @swagger
 * /chef/bookings/{id}:
 *   get:
 *     tags: [Chef]
 *     summary: Get a single booking request by ID (chef must be the recipient)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking detail
 *       404:
 *         description: Booking not found
 */
export const chefGetBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await guestBookingService.getChefBookingById(req.user!.userId, req.params.id as string);
  sendSuccess(res, "Booking fetched successfully", booking);
});

/**
 * @swagger
 * /chef/bookings/{id}/status:
 *   patch:
 *     tags: [Chef]
 *     summary: Update booking status (ACCEPTED, REJECTED, or COMPLETED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED, COMPLETED]
 *     responses:
 *       200:
 *         description: Status updated
 *       409:
 *         description: Invalid status transition
 */
export const chefUpdateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const booking = await guestBookingService.updateChefBookingStatus(
    req.user!.userId,
    req.params.id as string,
    req.body.status
  );
  sendSuccess(res, "Booking status updated successfully", booking);
});

// ─────────────────────────────────────────────────────────────
// HELPER — authentication required, ROLE_HELPER
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /helper/bookings:
 *   get:
 *     tags: [Helper]
 *     summary: List booking requests directed to the authenticated helper
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of bookings
 */
export const helperListBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await guestBookingService.getHelperBookings(req.user!.userId, req);
  sendSuccess(res, "Bookings fetched successfully", result.data, 200, result.meta);
});

/**
 * @swagger
 * /helper/bookings/{id}:
 *   get:
 *     tags: [Helper]
 *     summary: Get a single booking request by ID (helper must be the recipient)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking detail
 *       404:
 *         description: Not found
 */
export const helperGetBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await guestBookingService.getHelperBookingById(req.user!.userId, req.params.id as string);
  sendSuccess(res, "Booking fetched successfully", booking);
});

/**
 * @swagger
 * /helper/bookings/{id}/status:
 *   patch:
 *     tags: [Helper]
 *     summary: Update booking status (ACCEPTED, REJECTED, or COMPLETED)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED, COMPLETED]
 *     responses:
 *       200:
 *         description: Status updated
 *       409:
 *         description: Invalid status transition
 */
export const helperUpdateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const booking = await guestBookingService.updateHelperBookingStatus(
    req.user!.userId,
    req.params.id as string,
    req.body.status
  );
  sendSuccess(res, "Booking status updated successfully", booking);
});

// ─────────────────────────────────────────────────────────────
// ADMIN — authentication required, ROLE_ADMIN
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     tags: [Admin]
 *     summary: List all guest booking requests with full filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED] }
 *       - in: query
 *         name: event_type
 *         schema: { type: string }
 *       - in: query
 *         name: booking_type
 *         schema: { type: string, enum: [CHEF, HELPER] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [event_date, created_at, budget, guest_count] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [ASC, DESC] }
 *     responses:
 *       200:
 *         description: Paginated list of all bookings
 */
export const adminListBookings = asyncHandler(async (req: Request, res: Response) => {
  const result = await guestBookingService.adminListBookings(req);
  sendSuccess(res, "Bookings fetched successfully", result.data, 200, result.meta);
});

/**
 * @swagger
 * /admin/bookings/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard analytics for guest booking requests
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 */
export const adminGetAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const analytics = await guestBookingService.adminGetAnalytics();
  sendSuccess(res, "Analytics fetched successfully", analytics);
});

/**
 * @swagger
 * /admin/bookings/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a single guest booking request with chef/helper details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking detail
 *       404:
 *         description: Not found
 */
export const adminGetBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await guestBookingService.adminGetBookingById(req.params.id as string);
  sendSuccess(res, "Booking fetched successfully", booking);
});

/**
 * @swagger
 * /admin/bookings/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Permanently delete a guest booking request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
export const adminDeleteBooking = asyncHandler(async (req: Request, res: Response) => {
  await guestBookingService.adminDeleteBooking(req.params.id as string);
  sendSuccess(res, "Booking deleted successfully");
});
