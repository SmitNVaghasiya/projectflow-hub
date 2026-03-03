/**
 * Auth Route Tests — ProjectHub Backend
 *
 * Tests the full authentication lifecycle:
 * signup (with OTP) → login → profile → logout → token blacklisting
 *
 * Uses supertest to make real HTTP requests against the Express app.
 * Each describe block sets up its own test data and cleans up after itself.
 */

import request from "supertest";
import pool from "../db.js";
import { signToken } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// Import app without starting the server — only for testing
import app from "../app.js";

const TEST_EMAIL = `test_${Date.now()}@projecthub.test`;
const TEST_PASSWORD = "TestPassword123!";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Creates a verified user directly in the DB for tests that need one pre-existing */
async function createVerifiedUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
    const client = await pool.connect();
    try {
        const id = uuidv4();
        const hash = await bcrypt.hash(password, 12);
        await client.query(
            "INSERT INTO users (id, email, password_hash, email_verified) VALUES ($1, $2, $3, TRUE)",
            [id, email, hash]
        );
        return { id, email };
    } finally {
        client.release();
    }
}

/** Creates a valid, non-expired OTP code in DB for testing verify-otp */
async function createOtp(email, code = "123456") {
    const client = await pool.connect();
    try {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await client.query(
            "INSERT INTO otp_codes (id, email, code, expires_at) VALUES ($1, $2, $3, $4)",
            [uuidv4(), email, code, expiresAt]
        );
    } finally {
        client.release();
    }
}

/** Cleans up test data after each test suite */
async function cleanupUser(email) {
    const client = await pool.connect();
    try {
        await client.query("DELETE FROM users WHERE email = $1", [email]);
        await client.query("DELETE FROM otp_codes WHERE email = $1", [email]);
    } finally {
        client.release();
    }
}

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
describe("POST /api/auth/send-otp", () => {
    const otpEmail = `otp_${Date.now()}@projecthub.test`;

    afterAll(async () => {
        await cleanupUser(otpEmail);
    });

    it("should return 200 and store OTP in DB for valid email", async () => {
        const res = await request(app)
            .post("/api/auth/send-otp")
            .send({ email: otpEmail });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/OTP sent/i);

        // Verify OTP was stored in DB
        const client = await pool.connect();
        try {
            const result = await client.query(
                "SELECT * FROM otp_codes WHERE email = $1", [otpEmail]
            );
            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows[0].used).toBe(false);
        } finally {
            client.release();
        }
    });

    it("should return 400 for invalid email format", async () => {
        const res = await request(app)
            .post("/api/auth/send-otp")
            .send({ email: "not-an-email" });
        expect(res.status).toBe(400);
    });

    it("should return 429 when OTP requested more than 3 times in 10 minutes", async () => {
        const spamEmail = `spam_${Date.now()}@projecthub.test`;
        // Seed 3 recent OTPs directly in DB to trigger rate limit
        const client = await pool.connect();
        try {
            for (let i = 0; i < 3; i++) {
                await client.query(
                    "INSERT INTO otp_codes (id, email, code, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')",
                    [uuidv4(), spamEmail, "000000"]
                );
            }
        } finally {
            client.release();
        }
        const res = await request(app)
            .post("/api/auth/send-otp")
            .send({ email: spamEmail });
        expect(res.status).toBe(429);
        await cleanupUser(spamEmail);
    });
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
describe("POST /api/auth/verify-otp", () => {
    const verifyEmail = `verify_${Date.now()}@projecthub.test`;

    beforeAll(async () => {
        await createOtp(verifyEmail, "654321");
    });

    afterAll(async () => {
        await cleanupUser(verifyEmail);
    });

    it("should return 200 with correct OTP code", async () => {
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email: verifyEmail, code: "654321" });
        expect(res.status).toBe(200);
        expect(res.body.verified).toBe(true);
    });

    it("should return 401 for wrong OTP code", async () => {
        const email = `wrong_${Date.now()}@projecthub.test`;
        await createOtp(email, "999999");
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email, code: "000000" });
        expect(res.status).toBe(401);
        await cleanupUser(email);
    });

    it("should return 401 for expired OTP code", async () => {
        const email = `expired_${Date.now()}@projecthub.test`;
        const client = await pool.connect();
        try {
            // Insert already-expired OTP
            await client.query(
                "INSERT INTO otp_codes (id, email, code, expires_at) VALUES ($1, $2, $3, NOW() - INTERVAL '1 minute')",
                [uuidv4(), email, "123456"]
            );
        } finally {
            client.release();
        }
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email, code: "123456" });
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/expired/i);
        await cleanupUser(email);
    });

    it("should return 401 for already-used OTP (replay attack prevention)", async () => {
        const email = `replay_${Date.now()}@projecthub.test`;
        const client = await pool.connect();
        try {
            // Insert already-used OTP
            await client.query(
                "INSERT INTO otp_codes (id, email, code, expires_at, used) VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', TRUE)",
                [uuidv4(), email, "777777"]
            );
        } finally {
            client.release();
        }
        const res = await request(app)
            .post("/api/auth/verify-otp")
            .send({ email, code: "777777" });
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/already been used/i);
        await cleanupUser(email);
    });
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
describe("POST /api/auth/signup", () => {
    const signupEmail = `signup_${Date.now()}@projecthub.test`;

    beforeAll(async () => {
        await createOtp(signupEmail, "112233");
    });

    afterAll(async () => {
        await cleanupUser(signupEmail);
    });

    it("should return 201 and a JWT token for valid signup data", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email: signupEmail, password: "ValidPass123!", display_name: "Test User", code: "112233" });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(signupEmail);
    });

    it("should return 409 for duplicate email registration", async () => {
        // Need a fresh OTP for the duplicate attempt
        await createOtp(signupEmail, "445566");
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email: signupEmail, password: "ValidPass123!", code: "445566" });
        expect(res.status).toBe(409);
    });

    it("should return 400 for missing password", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email: "newemail@test.com", code: "000000" });
        expect(res.status).toBe(400);
    });

    it("should return 400 for password shorter than 8 characters", async () => {
        const email = `weak_${Date.now()}@projecthub.test`;
        await createOtp(email, "334455");
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email, password: "weak", code: "334455" });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/8 characters/i);
        await cleanupUser(email);
    });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
    const loginEmail = `login_${Date.now()}@projecthub.test`;
    const unverifiedEmail = `unverified_${Date.now()}@projecthub.test`;

    beforeAll(async () => {
        await createVerifiedUser(loginEmail, TEST_PASSWORD);
        // Create unverified user manually
        const client = await pool.connect();
        try {
            const hash = await bcrypt.hash(TEST_PASSWORD, 12);
            await client.query(
                "INSERT INTO users (id, email, password_hash, email_verified) VALUES ($1, $2, $3, FALSE)",
                [uuidv4(), unverifiedEmail, hash]
            );
        } finally {
            client.release();
        }
    });

    afterAll(async () => {
        await cleanupUser(loginEmail);
        await cleanupUser(unverifiedEmail);
    });

    it("should return 200 and JWT token for valid credentials", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: loginEmail, password: TEST_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it("should return 401 for wrong password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: loginEmail, password: "WrongPassword999!" });
        expect(res.status).toBe(401);
    });

    it("should return 403 for unverified email (forces OTP step)", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: unverifiedEmail, password: TEST_PASSWORD });
        expect(res.status).toBe(403);
        expect(res.body.requires_otp).toBe(true);
    });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
    let userId, token;

    beforeAll(async () => {
        const user = await createVerifiedUser(`logout_${Date.now()}@projecthub.test`);
        userId = user.id;
        token = signToken({ id: user.id, email: user.email });
    });

    afterAll(async () => {
        const client = await pool.connect();
        try {
            await client.query("DELETE FROM users WHERE id = $1", [userId]);
        } finally {
            client.release();
        }
    });

    it("should return 200 and blacklist the token", async () => {
        const res = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    it("should reject the same token after logout (blacklist check)", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/revoked/i);
    });
});
