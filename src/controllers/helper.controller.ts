import { Request, Response } from "express";
import * as helperService from "../services/helper.service";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await helperService.getHelperProfile(req.user!.userId);
  sendSuccess(res, "Profile fetched successfully", profile);
});

export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
  const profile = await helperService.getHelperProfileById(req.params.id as string);
  sendSuccess(res, "Profile fetched successfully", profile);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await helperService.updateHelperProfile(req.user!.userId, req.body);
  sendSuccess(res, "Profile updated successfully", profile);
});

export const updateSkills = asyncHandler(async (req: Request, res: Response) => {
  await helperService.updateHelperSkills(req.user!.userId, req.body.skills);
  sendSuccess(res, "Skills updated successfully");
});

export const searchHelpers = asyncHandler(async (req: Request, res: Response) => {
  const result = await helperService.searchHelpers(req);
  sendSuccess(res, "Helpers fetched successfully", result.data, 200, result.meta);
});

export const getAllSkills = asyncHandler(async (_req: Request, res: Response) => {
  const skills = await helperService.getAllSkills();
  sendSuccess(res, "Skills fetched successfully", skills);
});
