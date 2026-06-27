import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip as string | undefined;
  const ua = req.headers["user-agent"] as string | undefined;
  const { user, tokens } = await authService.registerUser(req.body, ip, ua);
  sendCreated(res, "Registration successful", { user, ...tokens });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip as string | undefined;
  const ua = req.headers["user-agent"] as string | undefined;
  const { user, tokens } = await authService.loginUser(req.body, ip, ua);
  sendSuccess(res, "Login successful", { user, ...tokens });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip as string | undefined;
  const ua = req.headers["user-agent"] as string | undefined;
  const tokens = await authService.refreshAccessToken(req.body.refreshToken, ip, ua);
  sendSuccess(res, "Token refreshed", tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutUser(req.body.refreshToken);
  sendSuccess(res, "Logged out successfully");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const token = await authService.initiatePasswordReset(req.body.email);
  const isDev = process.env.NODE_ENV === "development";
  sendSuccess(res, "If this email exists, a reset link has been sent", isDev ? { token } : undefined);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, "Password reset successfully");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(
    req.user!.userId,
    req.body.currentPassword,
    req.body.newPassword
  );
  sendSuccess(res, "Password changed successfully");
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, "User data fetched", req.user);
});
