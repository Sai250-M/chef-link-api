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
const allowedOrigins = [
  "https://chef-link-ui.vercel.app",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin ?? true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

// Explicit preflight handler must come before route registration
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

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
