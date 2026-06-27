import { Response } from "express";
import { ApiResponse, PaginationMeta } from "../types";

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: PaginationMeta
): Response => {
  const body: ApiResponse<T> = { success: true, message };
  if (data !== undefined) body.data = data;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string[]>
): Response => {
  const body: ApiResponse = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

export const sendCreated = <T>(res: Response, message: string, data?: T): Response =>
  sendSuccess(res, message, data, 201);

export const sendNotFound = (res: Response, message = "Resource not found"): Response =>
  sendError(res, message, 404);

export const sendUnauthorized = (res: Response, message = "Unauthorized"): Response =>
  sendError(res, message, 401);

export const sendForbidden = (res: Response, message = "Forbidden"): Response =>
  sendError(res, message, 403);

export const sendBadRequest = (
  res: Response,
  message: string,
  errors?: Record<string, string[]>
): Response => sendError(res, message, 400, errors);
