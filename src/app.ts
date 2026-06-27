import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import pool from "./config/db";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimiter.middleware";

const app: Express = express();

// ── Security ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static Files (uploaded content) ─────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Rate Limiting ─────────────────────────────────────────────
app.use("/api", apiRateLimiter);

// ── API Routes ────────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// ── Health Check ──────────────────────────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW() AS time, current_database() AS db");
    res.status(200).json({
      success: true,
      message: "ChefLink API healthy",
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// ── Root ─────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "ChefLink API v1",
    version: "1.0.0",
    docs: "/api/v1",
  });
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

export default app;
