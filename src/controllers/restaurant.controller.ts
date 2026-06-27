import { Request, Response } from "express";
import * as restaurantService from "../services/restaurant.service";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await restaurantService.getRestaurantProfile(req.user!.userId);
  sendSuccess(res, "Profile fetched successfully", profile);
});

export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
  const profile = await restaurantService.getRestaurantProfileById(req.params.id as string);
  sendSuccess(res, "Profile fetched successfully", profile);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await restaurantService.updateRestaurantProfile(req.user!.userId, req.body);
  sendSuccess(res, "Profile updated successfully", profile);
});

export const saveProfile = asyncHandler(async (req: Request, res: Response) => {
  await restaurantService.saveProfile(req.user!.userId, req.body.profile_id, req.body.profile_role);
  sendSuccess(res, "Profile saved successfully");
});

export const unsaveProfile = asyncHandler(async (req: Request, res: Response) => {
  await restaurantService.unsaveProfile(req.user!.userId, req.params.profileId as string);
  sendSuccess(res, "Profile removed from saved list");
});

export const getSavedProfiles = asyncHandler(async (req: Request, res: Response) => {
  const profiles = await restaurantService.getSavedProfiles(req.user!.userId);
  sendSuccess(res, "Saved profiles fetched", profiles);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await restaurantService.getRestaurantStats(req.user!.userId);
  sendSuccess(res, "Stats fetched successfully", stats);
});
