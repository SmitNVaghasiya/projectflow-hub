import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// ─── All project routes require authentication ────────────────────────────────
router.use(authenticate);

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required").max(255),
    description: z.string().max(2000).optional().default(""),
    status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    due_date: z.string().nullable().optional(),
});

const updateProjectSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    due_date: z.string().nullable().optional(),
});

const seedSchema = z.object({
    projects: z.array(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(2000).optional().default(""),
        status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
        priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
        due_date: z.string().nullable().optional(),
    })).min(1, "Projects array must not be empty"),
});

// ─── GET /api/projects ────────────────────────────────────────────────────────
// Returns all projects belonging to the authenticated user.
router.get("/", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
// Returns a single project by ID. 403 if project belongs to another user.
router.get("/:id", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Project not found." });
        }
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── POST /api/projects ──────────────────────────────────────────────────────
// Creates a new project for the authenticated user.
router.post("/", async (req, res, next) => {
    const parse = createProjectSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { name, description, status, priority, due_date } = parse.data;

    const id = uuidv4();
    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO projects (id, user_id, name, description, status, priority, due_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, req.user.id, name, description, status, priority, due_date ?? null]);

        const result = await client.query("SELECT * FROM projects WHERE id = $1", [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── POST /api/projects/seed ─────────────────────────────────────────────────
// Bulk-inserts multiple projects for the authenticated user (used for seeding).
router.post("/seed", async (req, res, next) => {
    const parse = seedSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }
    const { projects } = parse.data;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const p of projects) {
            await client.query(`
                INSERT INTO projects (id, user_id, name, description, status, priority, due_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [uuidv4(), req.user.id, p.name, p.description, p.status, p.priority, p.due_date ?? null]);
        }
        await client.query("COMMIT");
        res.status(201).json({ count: projects.length });
    } catch (err) {
        await client.query("ROLLBACK");
        next(err);
    } finally {
        client.release();
    }
});

// ─── PUT /api/projects/:id ───────────────────────────────────────────────────
// Updates a project. Returns 403 if project belongs to a different user.
router.put("/:id", async (req, res, next) => {
    const parse = updateProjectSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: parse.error.errors[0].message });
    }

    const client = await pool.connect();
    try {
        const existing = await client.query(
            "SELECT * FROM projects WHERE id = $1",
            [req.params.id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: "Project not found." });
        }
        if (existing.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: "You do not have permission to edit this project." });
        }

        const p = existing.rows[0];
        const { name, description, status, priority, due_date } = parse.data;

        await client.query(`
            UPDATE projects SET
                name        = $1,
                description = $2,
                status      = $3,
                priority    = $4,
                due_date    = $5,
                updated_at  = NOW()
            WHERE id = $6
        `, [
            name ?? p.name,
            description ?? p.description,
            status ?? p.status,
            priority ?? p.priority,
            due_date !== undefined ? due_date : p.due_date,
            req.params.id,
        ]);

        const updated = await client.query("SELECT * FROM projects WHERE id = $1", [req.params.id]);
        res.json(updated.rows[0]);
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

// ─── DELETE /api/projects/:id ────────────────────────────────────────────────
// Deletes a project. Returns 403 if project belongs to a different user.
router.delete("/:id", async (req, res, next) => {
    const client = await pool.connect();
    try {
        // Check ownership before deleting
        const existing = await client.query(
            "SELECT user_id FROM projects WHERE id = $1",
            [req.params.id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: "Project not found." });
        }
        if (existing.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: "You do not have permission to delete this project." });
        }

        await client.query("DELETE FROM projects WHERE id = $1", [req.params.id]);
        res.json({ message: "Project deleted successfully." });
    } catch (err) {
        next(err);
    } finally {
        client.release();
    }
});

export default router;
