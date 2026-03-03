import rateLimit from "express-rate-limit";

// ─── Global rate limit: 100 requests per 15 minutes per IP ──────────────────
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests — please try again later." },
});

// ─── Auth routes: 10 requests per 15 minutes per IP ─────────────────────────
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth requests — please try again in 15 minutes." },
});

// ─── OTP: 3 requests per 10 minutes per IP ───────────────────────────────────
// Applied individually on the send-otp route
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,   // 10 minutes
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OTP requests — please wait 10 minutes before requesting a new code." },
});
