import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import pool from "../db.js";
import { authenticate, signToken } from "../middleware/auth.js";

const router = Router();

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const client = await pool.connect();
    try {
        const cleanEmail = email.toLowerCase().trim();
        const existing = await client.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "User already registered" });
        }

        const id = uuidv4();
        const password_hash = await bcrypt.hash(password, 10);
        const name = display_name || "";

        await client.query(
            "INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)",
            [id, cleanEmail, password_hash, name]
        );

        const token = signToken({ id, email: cleanEmail });
        res.status(201).json({
            token,
            user: { id, email: cleanEmail, display_name: name, user_metadata: { display_name: name } },
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const client = await pool.connect();
    try {
        const cleanEmail = email.toLowerCase().trim();
        const result = await client.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid email or password" });
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
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, email, display_name, created_at FROM users WHERE id = $1", [req.user.id]
        );
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({
            id: user.id, email: user.email, display_name: user.display_name,
            user_metadata: { display_name: user.display_name }, created_at: user.created_at,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────
router.put("/me", authenticate, async (req, res) => {
    const { display_name } = req.body;
    const client = await pool.connect();
    try {
        if (display_name !== undefined) {
            await client.query("UPDATE users SET display_name = $1 WHERE id = $2", [display_name, req.user.id]);
        }
        const result = await client.query("SELECT id, email, display_name FROM users WHERE id = $1", [req.user.id]);
        const user = result.rows[0];
        res.json({ id: user.id, email: user.email, display_name: user.display_name, user_metadata: { display_name: user.display_name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── DELETE /api/auth/me ──────────────────────────────────────────────────────
router.delete("/me", authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);
        res.json({ message: "Account deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

export default router;
