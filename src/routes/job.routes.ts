import { Router } from "express";
import * as jobController from "../controllers/job.controller";
import * as appController from "../controllers/application.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { createJobSchema, updateJobSchema, jobSearchSchema, applyJobSchema, updateApplicationStatusSchema } from "../validators/job.validator";

const router = Router();

// Public routes
router.get("/search", validate(jobSearchSchema), jobController.searchJobs);
router.get("/:id", jobController.getJobById);

// Restaurant: manage jobs
router.post("/", authenticate, authorize("ROLE_RESTAURANT"), validate(createJobSchema), jobController.createJob);
router.put("/:id", authenticate, authorize("ROLE_RESTAURANT"), validate(updateJobSchema), jobController.updateJob);
router.delete("/:id", authenticate, authorize("ROLE_RESTAURANT"), jobController.deleteJob);
router.get("/restaurant/mine", authenticate, authorize("ROLE_RESTAURANT"), jobController.getMyJobs);

// Restaurant: view applications per job
router.get("/:jobId/applications", authenticate, authorize("ROLE_RESTAURANT"), appController.getJobApplications);
router.patch("/applications/:id/status", authenticate, authorize("ROLE_RESTAURANT"), validate(updateApplicationStatusSchema), appController.updateApplicationStatus);

// Chef / Helper: apply for job
router.post("/:jobId/apply", authenticate, authorize("ROLE_CHEF", "ROLE_HELPER"), validate(applyJobSchema), appController.applyForJob);
router.patch("/applications/:id/withdraw", authenticate, authorize("ROLE_CHEF", "ROLE_HELPER"), appController.withdrawApplication);

export default router;
