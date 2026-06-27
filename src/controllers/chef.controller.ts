import { Request, Response } from "express";
import * as chefService from "../services/chef.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await chefService.getChefProfile(req.user!.userId);
  sendSuccess(res, "Profile fetched successfully", profile);
});

export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
  const profile = await chefService.getChefProfileById(req.params.id as string);
  sendSuccess(res, "Profile fetched successfully", profile);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await chefService.updateChefProfile(req.user!.userId, req.body);
  sendSuccess(res, "Profile updated successfully", profile);
});

export const updateCuisines = asyncHandler(async (req: Request, res: Response) => {
  await chefService.updateChefCuisines(req.user!.userId, req.body.cuisine_ids);
  sendSuccess(res, "Cuisines updated successfully");
});

export const uploadCertificate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    sendSuccess(res, "No file uploaded", null, 400);
    return;
  }
  const fileUrl = `/uploads/certificates/${req.file.filename}`;
  const { title, issuer, issued_year } = req.body;
  const cert = await chefService.addCertificate(
    req.user!.userId,
    title as string,
    fileUrl,
    issuer as string | undefined,
    issued_year ? parseInt(issued_year as string, 10) : undefined
  );
  sendCreated(res, "Certificate uploaded successfully", cert);
});

export const deleteCertificate = asyncHandler(async (req: Request, res: Response) => {
  await chefService.deleteCertificate(req.user!.userId, req.params.certId as string);
  sendSuccess(res, "Certificate deleted successfully");
});

export const searchChefs = asyncHandler(async (req: Request, res: Response) => {
  const result = await chefService.searchChefs(req);
  sendSuccess(res, "Chefs fetched successfully", result.data, 200, result.meta);
});

export const getAllCuisines = asyncHandler(async (_req: Request, res: Response) => {
  const cuisines = await chefService.getAllCuisines();
  sendSuccess(res, "Cuisines fetched successfully", cuisines);
});
