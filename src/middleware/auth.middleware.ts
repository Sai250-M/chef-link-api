import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.utils";
import { sendUnauthorized, sendForbidden } from "../utils/apiResponse";
import { UserRole } from "../types";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    sendUnauthorized(res, "No token provided");
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    sendUnauthorized(res, "Invalid or expired token");
  }
};

export const authorize = (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendForbidden(res, "You do not have permission to perform this action");
      return;
    }
    next();
  };
