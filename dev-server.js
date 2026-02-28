// ─── Local Development Server ───────────────────────────────────────────────
// This wraps the Vercel serverless handlers in an Express app for local testing.
// In production on Vercel, the api/ folder is used directly as serverless functions.
import "dotenv/config";
import express from "express";
import cors from "cors";

// Import all serverless handlers
import signup from "./api/auth/signup.js";
import login from "./api/auth/login.js";
import me from "./api/auth/me.js";
import sendOtp from "./api/auth/send-otp.js";
import verifyOtp from "./api/auth/verify-otp.js";
import projects from "./api/projects/index.js";
import projectById from "./api/projects/[id].js";
import seed from "./api/projects/seed.js";
import health from "./api/health.js";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Route mapping (mirrors Vercel's api/ file structure) ────────────────────
app.all("/api/auth/signup", signup);
app.all("/api/auth/login", login);
app.all("/api/auth/me", me);
app.all("/api/auth/send-otp", sendOtp);
app.all("/api/auth/verify-otp", verifyOtp);
app.all("/api/projects/seed", seed);
app.all("/api/projects/:id", (req, res) => {
    req.query.id = req.params.id;
    return projectById(req, res);
});
app.all("/api/projects", projects);
app.all("/api/health", health);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n  ✅  ProjectHub API (dev server) running at http://localhost:${PORT}`);
    console.log(`  🐘  Database: PostgreSQL (Neon Serverless)`);
    console.log(`  📧  SMTP: ${process.env.EMAIL_USER || "not configured"}\n`);
});
