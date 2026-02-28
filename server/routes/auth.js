import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js";
import { authenticate, signToken } from "../middleware/auth.js";

const router = Router();

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post("/signup", (req, res) => {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
        return res.status(409).json({ error: "User already registered" });
    }

    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);

    db.prepare(
        "INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
    ).run(id, email.toLowerCase().trim(), password_hash, display_name || "");

    const token = signToken({ id, email });

    res.status(201).json({
        token,
        user: {
            id,
            email,
            display_name: display_name || "",
            user_metadata: { display_name: display_name || "" },
        },
    });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const user = db
        .prepare("SELECT * FROM users WHERE email = ?")
        .get(email.toLowerCase().trim());

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
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
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", authenticate, (req, res) => {
    const user = db.prepare("SELECT id, email, display_name, created_at FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        user_metadata: { display_name: user.display_name },
        created_at: user.created_at,
    });
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────
router.put("/me", authenticate, (req, res) => {
    const { display_name } = req.body;
    if (display_name !== undefined) {
        db.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(display_name, req.user.id);
    }
    const user = db.prepare("SELECT id, email, display_name FROM users WHERE id = ?").get(req.user.id);
    res.json({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        user_metadata: { display_name: user.display_name },
    });
});

// ─── DELETE /api/auth/me ──────────────────────────────────────────────────────
router.delete("/me", authenticate, (req, res) => {
    // Delete all user projects (tasks cascade via FK)
    db.prepare("DELETE FROM projects WHERE user_id = ?").run(req.user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);
    res.json({ message: "Account deleted" });
});

export default router;
