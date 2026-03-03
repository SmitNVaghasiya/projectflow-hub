import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load .env from the same directory as this file ─────────────────────────
config({ path: path.resolve(__dirname, ".env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
// import pool from "./db.js";  // Connection initialized during import
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Global rate limit (100 req / 15 min per IP) ────────────────────────────
app.use(globalLimiter);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Global error handler (must be last) ────────────────────────────────────
app.use(errorHandler);

export default app;
