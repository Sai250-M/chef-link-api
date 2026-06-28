import { Router } from "express";
import authRoutes from "./auth.routes";
import chefRoutes from "./chef.routes";
import helperRoutes from "./helper.routes";
import restaurantRoutes from "./restaurant.routes";
import jobRoutes from "./job.routes";
import eventRoutes from "./event.routes";
import bookingRoutes from "./booking.routes";
import {
  publicGuestBookingRoutes,
  chefGuestBookingRoutes,
  helperGuestBookingRoutes,
  adminGuestBookingRoutes,
} from "./guestBooking.routes";
import { authenticate } from "../middleware/auth.middleware";
import * as appController from "../controllers/application.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/chefs", chefRoutes);
router.use("/helpers", helperRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/jobs", jobRoutes);
router.use("/events", eventRoutes);
router.use("/event-bookings", bookingRoutes);

// ── Guest Event Booking Module ────────────────────────────────
router.use("/public", publicGuestBookingRoutes);   // no auth
router.use("/chef",   chefGuestBookingRoutes);     // ROLE_CHEF
router.use("/helper", helperGuestBookingRoutes);   // ROLE_HELPER
router.use("/admin",  adminGuestBookingRoutes);    // ROLE_ADMIN

// Notifications
router.get("/notifications", authenticate, appController.getNotifications);
router.patch("/notifications/read", authenticate, appController.markNotificationsRead);

// My applications (chef/helper)
router.get("/my-applications", authenticate, appController.getMyApplications);

export default router;
