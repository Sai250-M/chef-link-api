import { Router } from "express";
import * as eventController from "../controllers/event.controller";
import * as bookingController from "../controllers/booking.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  createEventSchema,
  updateEventSchema,
  eventSearchSchema,
  createBookingSchema,
} from "../validators/event.validator";

const router = Router();

// ── Public ────────────────────────────────────────────────────
router.get("/", validate(eventSearchSchema), eventController.searchEvents);
router.get("/:id", eventController.getEventById);

// ── Restaurant: manage events ─────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("ROLE_RESTAURANT"),
  validate(createEventSchema),
  eventController.createEvent
);

router.put(
  "/:id",
  authenticate,
  authorize("ROLE_RESTAURANT"),
  validate(updateEventSchema),
  eventController.updateEvent
);

router.delete(
  "/:id",
  authenticate,
  authorize("ROLE_RESTAURANT"),
  eventController.deleteEvent
);

router.get(
  "/restaurant/mine",
  authenticate,
  authorize("ROLE_RESTAURANT"),
  eventController.getMyEvents
);

// ── Restaurant: view bookings for a specific event ─────────────
router.get(
  "/:eventId/bookings",
  authenticate,
  authorize("ROLE_RESTAURANT"),
  bookingController.getEventBookings
);

// ── Chef / Helper: book an event ───────────────────────────────
router.post(
  "/:eventId/book",
  authenticate,
  authorize("ROLE_CHEF", "ROLE_HELPER"),
  validate(createBookingSchema),
  bookingController.createBooking
);

export default router;
