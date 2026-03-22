import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(["editor", "viewer"]).default("viewer"),
});
const updateRoleSchema = z.object({
    role: z.enum(["editor", "viewer"]),
});
const commentSchema = z.object({
    content: z.string().min(1).max(5000),
    task_id: z.string().nullable().optional(),
});
const updateCommentSchema = z.object({
    content: z.string().min(1).max(5000),
});

// ─── Middleware: check if user can access project (owner or member) ───────────
async function checkProjectAccess(client, projectId, userId, requireWrite = false) {
    // Is owner?
    const ownerRes = await client.query(
        `SELECT id FROM projects WHERE id=$1 AND user_id=$2`,
        [projectId, userId]
    );
    if (ownerRes.rows.length > 0) return { role: "owner", ok: true };

    // Is member?
    const memberRes = await client.query(
        `SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2`,
        [projectId, userId]
    );
    if (memberRes.rows.length === 0) return { role: null, ok: false };
    const role = memberRes.rows[0].role;
    if (requireWrite && role === "viewer") return { role, ok: false };
    return { role, ok: true };
}

// ─── GET /api/projects/:projectId/members ────────────────────────────────────
router.get("/:projectId/members", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const access = await checkProjectAccess(client, req.params.projectId, req.user.id);
        if (!access.ok) return res.status(403).json({ error: "Access denied." });

        const result = await client.query(
            `SELECT pm.id, pm.role, pm.joined_at,
                    u.id AS user_id, u.email, u.display_name
             FROM project_members pm
             JOIN users u ON u.id = pm.user_id
             WHERE pm.project_id=$1
             ORDER BY pm.joined_at ASC`,
            [req.params.projectId]
        );
        // Also include owner
        const owner = await client.query(
            `SELECT id AS user_id, email, display_name FROM users
             WHERE id=(SELECT user_id FROM projects WHERE id=$1)`,
            [req.params.projectId]
        );
        res.json({ owner: owner.rows[0], members: result.rows });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── POST /api/projects/:projectId/members — invite by email ─────────────────
router.post("/:projectId/members", async (req, res, next) => {
    const parse = inviteSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        // Must be owner to invite
        const owner = await client.query(
            `SELECT id FROM projects WHERE id=$1 AND user_id=$2`,
            [req.params.projectId, req.user.id]
        );
        if (owner.rows.length === 0) return res.status(403).json({ error: "Only the project owner can invite members." });

        // Find user by email
        const userRes = await client.query(`SELECT id FROM users WHERE email=$1`, [parse.data.email]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "No user found with that email address." });
        const inviteeId = userRes.rows[0].id;

        // Can't invite yourself
        if (inviteeId === req.user.id) return res.status(400).json({ error: "You cannot invite yourself." });

        // Upsert membership
        const id = uuidv4();
        await client.query(
            `INSERT INTO project_members (id, project_id, user_id, role, invited_by)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (project_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
            [id, req.params.projectId, inviteeId, parse.data.role, req.user.id]
        );
        res.status(201).json({ message: "Member invited successfully." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── PUT /api/projects/:projectId/members/:memberId — update role ─────────────
router.put("/:projectId/members/:memberId", async (req, res, next) => {
    const parse = updateRoleSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        const owner = await client.query(
            `SELECT id FROM projects WHERE id=$1 AND user_id=$2`,
            [req.params.projectId, req.user.id]
        );
        if (owner.rows.length === 0) return res.status(403).json({ error: "Only the project owner can change roles." });

        await client.query(
            `UPDATE project_members SET role=$1 WHERE id=$2 AND project_id=$3`,
            [parse.data.role, req.params.memberId, req.params.projectId]
        );
        res.json({ message: "Role updated." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── DELETE /api/projects/:projectId/members/:memberId — remove member ────────
router.delete("/:projectId/members/:memberId", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const owner = await client.query(
            `SELECT id FROM projects WHERE id=$1 AND user_id=$2`,
            [req.params.projectId, req.user.id]
        );
        if (owner.rows.length === 0) return res.status(403).json({ error: "Only the project owner can remove members." });

        await client.query(`DELETE FROM project_members WHERE id=$1 AND project_id=$2`, [req.params.memberId, req.params.projectId]);
        res.json({ message: "Member removed." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── GET /api/projects/:projectId/comments ───────────────────────────────────
router.get("/:projectId/comments", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const access = await checkProjectAccess(client, req.params.projectId, req.user.id);
        if (!access.ok) return res.status(403).json({ error: "Access denied." });

        const taskFilter = req.query.task_id ? `AND c.task_id=$2` : `AND c.task_id IS NULL`;
        const params = req.query.task_id
            ? [req.params.projectId, req.query.task_id]
            : [req.params.projectId];

        const result = await client.query(
            `SELECT c.id, c.content, c.task_id, c.created_at, c.updated_at,
                    u.id AS user_id, u.display_name, u.email
             FROM comments c
             JOIN users u ON u.id = c.user_id
             WHERE c.project_id=$1 ${taskFilter}
             ORDER BY c.created_at ASC`,
            params
        );
        res.json(result.rows);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── POST /api/projects/:projectId/comments ──────────────────────────────────
router.post("/:projectId/comments", async (req, res, next) => {
    const parse = commentSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        const access = await checkProjectAccess(client, req.params.projectId, req.user.id, true);
        if (!access.ok) return res.status(403).json({ error: "Access denied (viewer cannot comment)." });

        const id = uuidv4();
        await client.query(
            `INSERT INTO comments (id, project_id, task_id, user_id, content)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, req.params.projectId, parse.data.task_id ?? null, req.user.id, parse.data.content]
        );
        const result = await client.query(
            `SELECT c.id, c.content, c.task_id, c.created_at, c.updated_at,
                    u.id AS user_id, u.display_name, u.email
             FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=$1`,
            [id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── PUT /api/comments/:commentId ───────────────────────────────────────────
router.put("/comment/:commentId", async (req, res, next) => {
    const parse = updateCommentSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT id FROM comments WHERE id=$1 AND user_id=$2`,
            [req.params.commentId, req.user.id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Comment not found or not yours." });

        await client.query(
            `UPDATE comments SET content=$1, updated_at=NOW() WHERE id=$2`,
            [parse.data.content, req.params.commentId]
        );
        const result = await client.query(
            `SELECT c.id, c.content, c.task_id, c.created_at, c.updated_at,
                    u.id AS user_id, u.display_name, u.email
             FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=$1`,
            [req.params.commentId]
        );
        res.json(result.rows[0]);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── DELETE /api/comments/:commentId ────────────────────────────────────────
router.delete("/comment/:commentId", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT c.id FROM comments c 
             JOIN projects p ON c.project_id = p.id 
             WHERE c.id=$1 AND (c.user_id=$2 OR p.user_id=$2)`,
            [req.params.commentId, req.user.id]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Comment not found or you don't have permission to delete it." });
        await client.query(`DELETE FROM comments WHERE id=$1`, [req.params.commentId]);
        res.json({ message: "Comment deleted." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

export default router;
