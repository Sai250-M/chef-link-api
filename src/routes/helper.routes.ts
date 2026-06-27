import { Router } from "express";
import * as helperController from "../controllers/helper.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { updateHelperProfileSchema, addSkillsSchema, helperSearchSchema } from "../validators/helper.validator";

const router = Router();

// Public routes
router.get("/search", validate(helperSearchSchema), helperController.searchHelpers);
router.get("/skills", helperController.getAllSkills);
router.get("/:id", helperController.getProfileById);

// Protected - Helper only
router.get("/", authenticate, authorize("ROLE_HELPER"), helperController.getMyProfile);
router.put("/", authenticate, authorize("ROLE_HELPER"), validate(updateHelperProfileSchema), helperController.updateProfile);
router.put("/skills", authenticate, authorize("ROLE_HELPER"), validate(addSkillsSchema), helperController.updateSkills);

export default router;
