import { Request, Response } from "express";
import * as jobService from "../services/job.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.createJob(req.user!.userId, req.body);
  sendCreated(res, "Job post created successfully", job);
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.updateJob(req.user!.userId, req.params.id as string, req.body);
  sendSuccess(res, "Job post updated successfully", job);
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  await jobService.deleteJob(req.user!.userId, req.params.id as string);
  sendSuccess(res, "Job post deleted successfully");
});

export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  const job = await jobService.getJobById(req.params.id as string);
  sendSuccess(res, "Job fetched successfully", job);
});

export const getMyJobs = asyncHandler(async (req: Request, res: Response) => {
  const jobs = await jobService.getRestaurantJobs(req.user!.userId, req.query.status as string | undefined);
  sendSuccess(res, "Jobs fetched successfully", jobs);
});

export const searchJobs = asyncHandler(async (req: Request, res: Response) => {
  const result = await jobService.searchJobs(req);
  sendSuccess(res, "Jobs fetched successfully", result.data, 200, result.meta);
});
