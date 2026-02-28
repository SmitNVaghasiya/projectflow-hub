import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// ─── GET /api/projects ────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM projects WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Project not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── POST /api/projects ──────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    const { name, description, status, priority, due_date } = req.body;
    if (!name) return res.status(400).json({ error: "Project name is required" });

    const id = uuidv4();
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO projects (id, user_id, name, description, status, priority, due_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, req.user.id, name, description || "", status || "todo", priority || "medium", due_date || null]);

        const result = await client.query("SELECT * FROM projects WHERE id = $1", [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── POST /api/projects/seed ─────────────────────────────────────────────────
router.post("/seed", async (req, res) => {
    const { projects } = req.body;
    if (!Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json({ error: "Projects array is required" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const p of projects) {
            await client.query(`
                INSERT INTO projects (id, user_id, name, description, status, priority, due_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [uuidv4(), req.user.id, p.name, p.description || "", p.status || "todo", p.priority || "medium", p.due_date || null]);
        }
        await client.query("COMMIT");
        res.status(201).json({ count: projects.length });
    } catch (err) {
        await client.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── PUT /api/projects/:id ───────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            "SELECT * FROM projects WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Project not found" });

        const p = existing.rows[0];
        const { name, description, status, priority, due_date } = req.body;

        await client.query(`
            UPDATE projects SET
                name        = $1,
                description = $2,
                status      = $3,
                priority    = $4,
                due_date    = $5,
                updated_at  = NOW()
            WHERE id = $6 AND user_id = $7
        `, [
            name ?? p.name, description ?? p.description, status ?? p.status, priority ?? p.priority,
            due_date !== undefined ? due_date : p.due_date, req.params.id, req.user.id
        ]);

        const updated = await client.query("SELECT * FROM projects WHERE id = $1", [req.params.id]);
        res.json(updated.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─── DELETE /api/projects/:id ────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Project not found" });
        res.json({ message: "Project deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

export default router;
