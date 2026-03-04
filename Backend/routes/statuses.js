import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const createStatusSchema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").default("#6366f1"),
});
const updateStatusSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    sort_order: z.number().int().optional(),
});

// GET /api/statuses
router.get("/", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM custom_statuses WHERE user_id=$1 ORDER BY sort_order ASC, created_at ASC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// POST /api/statuses
router.post("/", async (req, res, next) => {
    const parse = createStatusSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        // sort_order = current max + 1
        const { rows: [{ max_order }] } = await client.query(
            `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM custom_statuses WHERE user_id=$1`,
            [req.user.id]
        );
        const id = uuidv4();
        await client.query(
            `INSERT INTO custom_statuses (id, user_id, name, color, sort_order) VALUES ($1,$2,$3,$4,$5)`,
            [id, req.user.id, parse.data.name, parse.data.color, max_order + 1]
        );
        const result = await client.query(`SELECT * FROM custom_statuses WHERE id=$1`, [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// PUT /api/statuses/:id
router.put("/:id", async (req, res, next) => {
    const parse = updateStatusSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT id FROM custom_statuses WHERE id=$1 AND user_id=$2`,
            [req.params.id, req.user.id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Status not found." });

        const { name, color, sort_order } = parse.data;
        await client.query(
            `UPDATE custom_statuses SET
                name = COALESCE($1, name),
                color = COALESCE($2, color),
                sort_order = COALESCE($3, sort_order)
             WHERE id=$4`,
            [name, color, sort_order, req.params.id]
        );
        const result = await client.query(`SELECT * FROM custom_statuses WHERE id=$1`, [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// DELETE /api/statuses/:id
router.delete("/:id", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT id FROM custom_statuses WHERE id=$1 AND user_id=$2`,
            [req.params.id, req.user.id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Status not found." });
        await client.query(`DELETE FROM custom_statuses WHERE id=$1`, [req.params.id]);
        res.json({ message: "Status deleted." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

export default router;
