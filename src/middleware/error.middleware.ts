import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV === "development";

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // PostgreSQL unique violation
  if ((err as any).code === "23505") {
    res.status(409).json({
      success: false,
      message: "A record with this value already exists",
    });
    return;
  }

  // PostgreSQL foreign key violation
  if ((err as any).code === "23503") {
    res.status(400).json({
      success: false,
      message: "Referenced resource does not exist",
    });
    return;
  }

  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(isDev && { stack: err.stack }),
  });
};
