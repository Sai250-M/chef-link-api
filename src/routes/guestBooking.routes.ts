/**
 * Guest Event Booking Routes
 *
 * Public  → /api/v1/public/chefs | /api/v1/public/helpers | /api/v1/public/bookings
 * Chef    → /api/v1/chef/bookings
 * Helper  → /api/v1/helper/bookings
 * Admin   → /api/v1/admin/bookings | /api/v1/admin/bookings/analytics
 *
 * Each sub-router is exported and mounted independently in routes/index.ts
 * so URL prefixes stay clean and role guards are co-located with the routes.
 */

import { Router } from "express";
import * as ctrl from "../controllers/guestBooking.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  browseChefSchema,
  browseHelperSchema,
  profileParamsSchema,
  createGuestBookingSchema,
  updateGuestBookingStatusSchema,
  bookingListQuerySchema,
  bookingIdParamSchema,
} from "../validators/guestBooking.validator";

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTER  (mounted at /api/v1/public)
// ─────────────────────────────────────────────────────────────
export const publicGuestBookingRoutes = Router();

// GET /api/v1/public/chefs
publicGuestBookingRoutes.get(
  "/chefs",
  validate(browseChefSchema),
  ctrl.browseChefs
);

// GET /api/v1/public/chefs/:id
publicGuestBookingRoutes.get(
  "/chefs/:id",
  validate(profileParamsSchema),
  ctrl.getChefDetail
);

// GET /api/v1/public/helpers
publicGuestBookingRoutes.get(
  "/helpers",
  validate(browseHelperSchema),
  ctrl.browseHelpers
);

// GET /api/v1/public/helpers/:id
publicGuestBookingRoutes.get(
  "/helpers/:id",
  validate(profileParamsSchema),
  ctrl.getHelperDetail
);

// POST /api/v1/public/bookings
publicGuestBookingRoutes.post(
  "/bookings",
  validate(createGuestBookingSchema),
  ctrl.createGuestBooking
);

// ─────────────────────────────────────────────────────────────
// CHEF ROUTER  (mounted at /api/v1/chef)
// ─────────────────────────────────────────────────────────────
export const chefGuestBookingRoutes = Router();

// GET /api/v1/chef/bookings
chefGuestBookingRoutes.get(
  "/bookings",
  authenticate,
  authorize("ROLE_CHEF"),
  validate(bookingListQuerySchema),
  ctrl.chefListBookings
);

// GET /api/v1/chef/bookings/:id
chefGuestBookingRoutes.get(
  "/bookings/:id",
  authenticate,
  authorize("ROLE_CHEF"),
  validate(bookingIdParamSchema),
  ctrl.chefGetBooking
);

// PATCH /api/v1/chef/bookings/:id/status
chefGuestBookingRoutes.patch(
  "/bookings/:id/status",
  authenticate,
  authorize("ROLE_CHEF"),
  validate(updateGuestBookingStatusSchema),
  ctrl.chefUpdateBookingStatus
);

// ─────────────────────────────────────────────────────────────
// HELPER ROUTER  (mounted at /api/v1/helper)
// ─────────────────────────────────────────────────────────────
export const helperGuestBookingRoutes = Router();

// GET /api/v1/helper/bookings
helperGuestBookingRoutes.get(
  "/bookings",
  authenticate,
  authorize("ROLE_HELPER"),
  validate(bookingListQuerySchema),
  ctrl.helperListBookings
);

// GET /api/v1/helper/bookings/:id
helperGuestBookingRoutes.get(
  "/bookings/:id",
  authenticate,
  authorize("ROLE_HELPER"),
  validate(bookingIdParamSchema),
  ctrl.helperGetBooking
);

// PATCH /api/v1/helper/bookings/:id/status
helperGuestBookingRoutes.patch(
  "/bookings/:id/status",
  authenticate,
  authorize("ROLE_HELPER"),
  validate(updateGuestBookingStatusSchema),
  ctrl.helperUpdateBookingStatus
);

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTER  (mounted at /api/v1/admin)
// ─────────────────────────────────────────────────────────────
export const adminGuestBookingRoutes = Router();

// GET /api/v1/admin/bookings/analytics  — must be defined BEFORE /:id to avoid param conflict
adminGuestBookingRoutes.get(
  "/bookings/analytics",
  authenticate,
  authorize("ROLE_ADMIN"),
  ctrl.adminGetAnalytics
);

// GET /api/v1/admin/bookings
adminGuestBookingRoutes.get(
  "/bookings",
  authenticate,
  authorize("ROLE_ADMIN"),
  validate(bookingListQuerySchema),
  ctrl.adminListBookings
);

// GET /api/v1/admin/bookings/:id
adminGuestBookingRoutes.get(
  "/bookings/:id",
  authenticate,
  authorize("ROLE_ADMIN"),
  validate(bookingIdParamSchema),
  ctrl.adminGetBooking
);

// DELETE /api/v1/admin/bookings/:id
adminGuestBookingRoutes.delete(
  "/bookings/:id",
  authenticate,
  authorize("ROLE_ADMIN"),
  validate(bookingIdParamSchema),
  ctrl.adminDeleteBooking
);
