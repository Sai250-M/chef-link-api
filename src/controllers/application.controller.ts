import { Request, Response } from "express";
import * as appService from "../services/application.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const applyForJob = asyncHandler(async (req: Request, res: Response) => {
  const application = await appService.applyForJob(
    req.params.jobId as string,
    req.user!.userId,
    req.user!.role,
    req.body.cover_letter
  );
  sendCreated(res, "Application submitted successfully", application);
});

export const withdrawApplication = asyncHandler(async (req: Request, res: Response) => {
  await appService.withdrawApplication(req.user!.userId, req.params.id as string);
  sendSuccess(res, "Application withdrawn successfully");
});

export const getMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await appService.getMyApplications(req, req.user!.userId);
  sendSuccess(res, "Applications fetched successfully", result.data, 200, result.meta);
});

export const getJobApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await appService.getJobApplications(
    req.user!.userId,
    req.params.jobId as string,
    req
  );
  sendSuccess(res, "Applications fetched successfully", result.data, 200, result.meta);
});

export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const application = await appService.updateApplicationStatus(
    req.user!.userId,
    req.params.id as string,
    req.body.status
  );
  sendSuccess(res, "Application status updated", application);
});

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await appService.getNotifications(req.user!.userId);
  sendSuccess(res, "Notifications fetched", notifications);
});

export const markNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await appService.markNotificationsRead(req.user!.userId, req.body.notification_ids);
  sendSuccess(res, "Notifications marked as read");
});
