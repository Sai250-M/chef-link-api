import { Router } from "express";
import * as chefController from "../controllers/chef.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { updateChefProfileSchema, addCuisinesSchema, chefSearchSchema } from "../validators/chef.validator";
import { uploadCertificate } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/search", validate(chefSearchSchema), chefController.searchChefs);
router.get("/cuisines", chefController.getAllCuisines);
router.get("/:id", chefController.getProfileById);

// Protected - Chef only
router.get("/", authenticate, authorize("ROLE_CHEF"), chefController.getMyProfile);
router.put("/", authenticate, authorize("ROLE_CHEF"), validate(updateChefProfileSchema), chefController.updateProfile);
router.put("/cuisines", authenticate, authorize("ROLE_CHEF"), validate(addCuisinesSchema), chefController.updateCuisines);
router.post(
  "/certificates",
  authenticate,
  authorize("ROLE_CHEF"),
  uploadCertificate.single("file"),
  chefController.uploadCertificate
);
router.delete("/certificates/:certId", authenticate, authorize("ROLE_CHEF"), chefController.deleteCertificate);

export default router;
