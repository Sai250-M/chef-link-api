import { Router } from "express";
import * as restaurantController from "../controllers/restaurant.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { updateRestaurantProfileSchema, saveProfileSchema } from "../validators/restaurant.validator";

const router = Router();

// Public routes
router.get("/:id", restaurantController.getProfileById);

// Protected - Restaurant only
router.get("/", authenticate, authorize("ROLE_RESTAURANT"), restaurantController.getMyProfile);
router.get("/stats/dashboard", authenticate, authorize("ROLE_RESTAURANT"), restaurantController.getStats);
router.put("/", authenticate, authorize("ROLE_RESTAURANT"), validate(updateRestaurantProfileSchema), restaurantController.updateProfile);
router.post("/saved-profiles", authenticate, authorize("ROLE_RESTAURANT"), validate(saveProfileSchema), restaurantController.saveProfile);
router.get("/saved-profiles/list", authenticate, authorize("ROLE_RESTAURANT"), restaurantController.getSavedProfiles);
router.delete("/saved-profiles/:profileId", authenticate, authorize("ROLE_RESTAURANT"), restaurantController.unsaveProfile);

export default router;
