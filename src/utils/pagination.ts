import { Request } from "express";
import { PaginationMeta } from "../types";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const getPaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const buildOrderClause = (
  req: Request,
  allowedFields: string[],
  defaultField = "created_at",
  defaultDir: "ASC" | "DESC" = "DESC"
): string => {
  const sortBy = allowedFields.includes(req.query.sortBy as string)
    ? (req.query.sortBy as string)
    : defaultField;
  const dir = (req.query.sortDir as string)?.toUpperCase() === "ASC" ? "ASC" : defaultDir;
  return `ORDER BY ${sortBy} ${dir}`;
};
