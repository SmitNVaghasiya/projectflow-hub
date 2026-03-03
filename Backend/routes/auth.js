import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { z } from "zod";
import pool from "../db.js";
import { authenticate, signToken } from "../middleware/auth.js";
import { otpLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    display_name: z.string().max(80).optional(),
    code: z.string().length(6, "OTP code must be 6 digits"),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

const sendOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
});

const verifyOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
    code: z.string().length(6, "OTP code must be 6 digits"),
});

/**
 * Creates a Nodemailer transporter using Gmail App Password from env.
 * Throws at runtime if credentials are not configured.
 */
function createMailTransport() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });
}

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
// Generates a new 6-digit OTP and emails it to the user for verification.
router.post("/send-otp", otpLimiter, async (req, res, next) => {
    const parse = sendOtpSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { email } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    const client = await pool.connect();
    try {
        // Rate limit: max 3 OTPs per email per 10 minutes (in DB)
        const recentCount = await client.query(`
            SELECT COUNT(*) FROM otp_codes
            WHERE email = $1 AND created_at > NOW() - INTERVAL '10 minutes'
        `, [cleanEmail]);
        if (parseInt(recentCount.rows[0].count) >= 3) {
            return res.status(429).json({
                error: "Too many OTP requests for this email. Please wait 10 minutes.",
            });
        }

        // Generate a cryptographically secure 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await client.query(
            "INSERT INTO otp_codes (id, email, code, expires_at) VALUES ($1, $2, $3, $4)",
            [uuidv4(), cleanEmail, code, expiresAt]
        );

        // Send OTP email via Gmail SMTP
        if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
            const transporter = createMailTransport();
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || `"ProjectHub" <${process.env.EMAIL_USER}>`,
                to: cleanEmail,
                subject: "Your ProjectHub verification code",
                html: `
                    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
                        <h2 style="color: #1a1a2e;">Verify your email</h2>
                        <p>Your one-time verification code is:</p>
                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                                    background: #f4f4f8; padding: 20px; text-align: center;
                                    border-radius: 8px; color: #1a1a2e;">
                            ${code}
                        </div>
                        <p style="color: #666; margin-top: 16px;">
                            This code expires in <strong>10 minutes</strong>.
                            If you didn't request this, you can safely ignore this email.
                        </p>
                    </div>
                `,
            });
        } else {
            // Dev fallback: log to console if SMTP not configured
            console.log(`  📧  [DEV] OTP for ${cleanEmail}: ${code}`);
        }

        res.json({ message: "OTP sent to your email address." });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Validates the OTP code and marks the email as verified in the users table.
router.post("/verify-otp", async (req, res, next) => {
    const parse = verifyOtpSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { email, code } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT * FROM otp_codes
            WHERE email = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [cleanEmail]);

        const otp = result.rows[0];

        if (!otp) {
            return res.status(401).json({ error: "No OTP found for this email. Request a new code." });
        }
        if (otp.used) {
            return res.status(401).json({ error: "This OTP has already been used. Request a new code." });
        }
        if (new Date() > new Date(otp.expires_at)) {
            return res.status(401).json({ error: "OTP has expired. Request a new code." });
        }
        if (otp.code !== code) {
            return res.status(401).json({ error: "Incorrect OTP code." });
        }

        // Mark OTP as used
        await client.query("UPDATE otp_codes SET used = TRUE WHERE id = $1", [otp.id]);

        // Mark user's email as verified (if user already exists at this email)
        await client.query(
            "UPDATE users SET email_verified = TRUE WHERE email = $1",
            [cleanEmail]
        );

        // If user exists and is now verified, return a token so they get logged in automatically
        const userResult = await client.query(
            "SELECT id, email, display_name FROM users WHERE email = $1",
            [cleanEmail]
        );
        const user = userResult.rows[0];

        if (user) {
            const token = signToken({ id: user.id, email: user.email });
            return res.json({
                message: "Email verified successfully.",
                verified: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    display_name: user.display_name,
                    user_metadata: { display_name: user.display_name },
                },
            });
        }

        res.json({ message: "Email verified successfully.", verified: true });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Creates a new user account. Requires a valid, pre-verified OTP code.
router.post("/signup", async (req, res, next) => {
    const parse = signupSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { email, password, display_name, code } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    const client = await pool.connect();
    try {
        // Verify OTP is valid before creating account
        const otpResult = await client.query(`
            SELECT * FROM otp_codes
            WHERE email = $1
            ORDER BY created_at DESC LIMIT 1
        `, [cleanEmail]);
        const otp = otpResult.rows[0];

        if (!otp || otp.used || new Date() > new Date(otp.expires_at) || otp.code !== code) {
            return res.status(400).json({ error: "Invalid or expired OTP. Please verify your email first." });
        }

        // Check for duplicate email
        const existing = await client.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        // Hash password with bcrypt cost factor 12
        const id = uuidv4();
        const password_hash = await bcrypt.hash(password, 12);
        const name = display_name || "";

        await client.query(
            "INSERT INTO users (id, email, password_hash, display_name, email_verified) VALUES ($1, $2, $3, $4, TRUE)",
            [id, cleanEmail, password_hash, name]
        );

        // Mark OTP as used
        await client.query("UPDATE otp_codes SET used = TRUE WHERE id = $1", [otp.id]);

        const token = signToken({ id, email: cleanEmail });
        res.status(201).json({
            token,
            user: { id, email: cleanEmail, display_name: name, user_metadata: { display_name: name } },
        });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Authenticates a user with email + password. Returns a JWT token.
router.post("/login", async (req, res, next) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { email, password } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    const client = await pool.connect();
    try {
        const result = await client.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        if (!user.email_verified) {
            return res.status(403).json({
                error: "Please verify your email before logging in.",
                requires_otp: true,
            });
        }

        const token = signToken({ id: user.id, email: user.email });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                user_metadata: { display_name: user.display_name },
            },
        });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Blacklists the current JWT token so it cannot be reused.
router.post("/logout", authenticate, async (req, res, next) => {
    const client = await pool.connect();
    try {
        // req.tokenJti is set by authenticate middleware
        if (req.tokenJti) {
            await client.query(
                "INSERT INTO revoked_tokens (jti) VALUES ($1) ON CONFLICT DO NOTHING",
                [req.tokenJti]
            );
        }
        res.json({ message: "Logged out successfully." });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the currently authenticated user's profile.
router.get("/me", authenticate, async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, email, display_name, created_at FROM users WHERE id = $1",
            [req.user.id]
        );
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: "User not found." });

        res.json({
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            user_metadata: { display_name: user.display_name },
            created_at: user.created_at,
        });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────
// Updates the authenticated user's display name.
router.put("/me", authenticate, async (req, res, next) => {
    const schema = z.object({ display_name: z.string().max(80).optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }

    const client = await pool.connect();
    try {
        const { display_name } = parse.data;
        if (display_name !== undefined) {
            await client.query(
                "UPDATE users SET display_name = $1 WHERE id = $2",
                [display_name, req.user.id]
            );
        }
        const result = await client.query(
            "SELECT id, email, display_name FROM users WHERE id = $1",
            [req.user.id]
        );
        const user = result.rows[0];
        res.json({
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            user_metadata: { display_name: user.display_name },
        });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── DELETE /api/auth/me ──────────────────────────────────────────────────────
// Permanently deletes the authenticated user's account and all their data.
router.delete("/me", authenticate, async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);
        res.json({ message: "Account deleted successfully." });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

export default router;
