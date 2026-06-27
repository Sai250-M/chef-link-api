import { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { sendBadRequest } from "../utils/apiResponse";

export const validate = (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors: Record<string, string[]> = {};
      const issues = (result.error as any)?.issues ?? [];

      issues.forEach((issue: { path: (string | number)[]; message: string }) => {
        const field = issue.path.slice(1).join(".") || "general";
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      });

      sendBadRequest(res, "Validation failed", errors);
      return;
    }

    next();
  };
