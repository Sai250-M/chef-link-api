import { Router } from "express";
import * as bookingController from "../controllers/booking.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { updateBookingStatusSchema } from "../validators/event.validator";

const router = Router();

// ── Chef / Helper ─────────────────────────────────────────────
router.get(
  "/my-bookings",
  authenticate,
  authorize("ROLE_CHEF", "ROLE_HELPER"),
  bookingController.getMyBookings
);

router.delete(
  "/:id",
  authenticate,
  authorize("ROLE_CHEF", "ROLE_HELPER"),
  bookingController.cancelBooking
);

// ── Restaurant ────────────────────────────────────────────────
router.patch(
  "/:id/status",
  authenticate,
  authorize("ROLE_RESTAURANT"),
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus
);

export default router;
