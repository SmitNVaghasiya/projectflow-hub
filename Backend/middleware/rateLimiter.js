import rateLimit from "express-rate-limit";

// ─── Global rate limit: 100 requests per 15 minutes per IP ──────────────────
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many requests — please try again later." },
});

// ─── Auth routes: 10 requests per 15 minutes per IP ─────────────────────────
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many auth requests — please try again in 15 minutes." },
});

// ─── OTP: 3 requests per 10 minutes per IP ───────────────────────────────────
// Applied individually on the send-otp route
export const otpLimiter = rateLimit({
    windowMs: 2 * 60 * 1000,   // 2 minutes
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many OTP requests — please wait 2 minutes before requesting a new code." },
});

// ─── Generous Daily Project Quota (User-level) ──────────────────────────────
export const projectCreationLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 50,
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Daily project creation limit reached. Please contact support if you need a higher limit." },
    handler: (req, res, next, options) => {
        console.warn(`[ALERT] Rate Limit Exceeded: User ${req.user?.id} attempted to create more than 50 projects today.`);
        res.status(options.statusCode).send(options.message);
    }
});

// ─── Generous Daily Task Quota (User-level Combined) ────────────────────────
export const taskCreationLimiterGlobal = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 3000,
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Daily global task creation limit reached (3000). Please contact support if you need a higher limit." },
    handler: (req, res, next, options) => {
        console.warn(`[ALERT] Rate Limit Exceeded: User ${req.user?.id} attempted to create more than 3000 total tasks today.`);
        res.status(options.statusCode).send(options.message);
    }
});

// ─── Generous Daily Task Quota (Per-Project) ────────────────────────────────
export const taskCreationLimiterPerProject = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 500,
    keyGenerator: (req) => `${req.user?.id}_${req.params.projectId}` || req.ip,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Daily task creation limit reached for this specific project (500). Please contact support if you need a higher limit." },
    handler: (req, res, next, options) => {
        console.warn(`[ALERT] Rate Limit Exceeded: User ${req.user?.id} hit the 500 task/day limit on project ${req.params.projectId}.`);
        res.status(options.statusCode).send(options.message);
    }
});
