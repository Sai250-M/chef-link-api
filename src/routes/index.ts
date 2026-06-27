import { Router } from "express";
import authRoutes from "./auth.routes";
import chefRoutes from "./chef.routes";
import helperRoutes from "./helper.routes";
import restaurantRoutes from "./restaurant.routes";
import jobRoutes from "./job.routes";
import { authenticate } from "../middleware/auth.middleware";
import * as appController from "../controllers/application.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/chefs", chefRoutes);
router.use("/helpers", helperRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/jobs", jobRoutes);

// Notifications
router.get("/notifications", authenticate, appController.getNotifications);
router.patch("/notifications/read", authenticate, appController.markNotificationsRead);

// My applications (chef/helper)
router.get("/my-applications", authenticate, appController.getMyApplications);

export default router;
