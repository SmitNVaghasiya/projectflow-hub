import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import pool from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// ─── Schemas ─────────────────────────────────────────────────────────────────
const createTaskSchema = z.object({
    content: z.string().min(1, "Task content is required").max(5000),
    task_type: z.enum(["simple", "complex"]).optional().default("simple"),
    status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    due_date: z.string().nullable().optional(),
    due_time: z.string().nullable().optional(),
    sort_order: z.number().int().optional().default(0),
});

const updateTaskSchema = z.object({
    content: z.string().min(1).max(5000).optional(),
    task_type: z.enum(["simple", "complex"]).optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    due_date: z.string().nullable().optional(),
    due_time: z.string().nullable().optional(),
    sort_order: z.number().int().optional(),
});

const createSubItemSchema = z.object({
    content: z.string().min(1).max(2000),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    due_date: z.string().nullable().optional(),
    due_time: z.string().nullable().optional(),
    sort_order: z.number().int().optional().default(0),
});

const updateSubItemSchema = z.object({
    content: z.string().min(1).max(2000).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    due_date: z.string().nullable().optional(),
    due_time: z.string().nullable().optional(),
    is_done: z.boolean().optional(),
    sort_order: z.number().int().optional(),
});

const reorderSchema = z.object({
    order: z.array(z.object({ id: z.string(), sort_order: z.number().int() })),
});

// ─── Helper: log activity + check / award badges ─────────────────────────────
async function logActivity(client, userId, actionType, projectId = null, taskId = null) {
    await client.query(
        `INSERT INTO activity_log (id, user_id, action_type, project_id, task_id) VALUES ($1,$2,$3,$4,$5)`,
        [uuidv4(), userId, actionType, projectId, taskId]
    );
    await checkAndAwardBadges(client, userId, projectId);
}

async function checkAndAwardBadges(client, userId, projectId = null) {
    const newBadges = [];

    // Helper: award badge if not already earned
    const award = async (badgeId) => {
        try {
            await client.query(
                `INSERT INTO user_badges (id, user_id, badge_id, project_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
                [uuidv4(), userId, badgeId, projectId]
            );
            const res = await client.query(
                `SELECT b.name, b.icon FROM badges b WHERE b.id=$1`, [badgeId]
            );
            if (res.rows[0]) newBadges.push(res.rows[0]);
        } catch (_) { /* ignore duplicate */ }
    };

    // Count total projects created
    const { rows: [{ count: totalProjects }] } = await client.query(
        `SELECT COUNT(*) FROM projects WHERE user_id=$1`, [userId]
    );
    if (parseInt(totalProjects) >= 1) await award('badge-first-launch');

    // Count completed projects
    const { rows: [{ count: doneProjects }] } = await client.query(
        `SELECT COUNT(*) FROM projects WHERE user_id=$1 AND status='done'`, [userId]
    );
    if (parseInt(doneProjects) >= 5) await award('badge-milestone-5');
    if (parseInt(doneProjects) >= 10) await award('badge-milestone-10');

    // Count completed tasks for user
    const { rows: [{ count: doneTasks }] } = await client.query(
        `SELECT COUNT(*) FROM tasks WHERE user_id=$1 AND status='done'`, [userId]
    );
    if (parseInt(doneTasks) >= 1) await award('badge-first-win');

    // Speed run: project completed within 24h of creation
    if (projectId) {
        const speedRes = await client.query(
            `SELECT id FROM projects WHERE id=$1 AND user_id=$2 AND status='done'
             AND EXTRACT(EPOCH FROM (updated_at - created_at)) < 86400`,
            [projectId, userId]
        );
        if (speedRes.rows.length > 0) await award('badge-speed-run');

        // On-time: project completed before due_date
        const onTimeRes = await client.query(
            `SELECT id FROM projects WHERE id=$1 AND user_id=$2 AND status='done'
             AND due_date IS NOT NULL AND updated_at::date <= due_date::date`,
            [projectId, userId]
        );
        if (onTimeRes.rows.length > 0) await award('badge-on-time');

        // Deep planner: >= 10 tasks in this project
        const { rows: [{ count: taskCount }] } = await client.query(
            `SELECT COUNT(*) FROM tasks WHERE project_id=$1`, [projectId]
        );
        if (parseInt(taskCount) >= 10) await award('badge-deep-planner');

        // Full sweep: all tasks done and project has due_date and today <= due_date
        const { rows: [{ count: undone }] } = await client.query(
            `SELECT COUNT(*) FROM tasks WHERE project_id=$1 AND status != 'done'`, [projectId]
        );
        const projRes = await client.query(`SELECT due_date, status FROM projects WHERE id=$1`, [projectId]);
        const proj = projRes.rows[0];
        if (parseInt(undone) === 0 && proj?.due_date && proj?.status === 'done') {
            await award('badge-full-sweep');
        }
    }

    // Activity streak (7 and 30 days)
    const { rows: [{ count: streak7 }] } = await client.query(
        `SELECT COUNT(DISTINCT DATE(created_at)) FROM activity_log
         WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '7 days'`, [userId]
    );
    if (parseInt(streak7) >= 7) await award('badge-consistent');

    const { rows: [{ count: streak30 }] } = await client.query(
        `SELECT COUNT(DISTINCT DATE(created_at)) FROM activity_log
         WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '30 days'`, [userId]
    );
    if (parseInt(streak30) >= 30) await award('badge-streak-master');

    // All-rounder: earned 5+ badges
    const { rows: [{ count: earnedCount }] } = await client.query(
        `SELECT COUNT(*) FROM user_badges WHERE user_id=$1`, [userId]
    );
    if (parseInt(earnedCount) >= 5) await award('badge-all-rounder');

    return newBadges;
}

// ─── Helper: verify if user can edit a project (owner or editor) ─────────────
async function hasEditAccess(client, userId, projectId) {
    console.log(`[hasEditAccess] CHECKING ACCESS - User: ${userId}, Project: ${projectId}`);
    const p = await client.query(`SELECT id FROM projects WHERE id=$1 AND user_id=$2`, [projectId, userId]);
    console.log(`[hasEditAccess] owner check rows: ${p.rows.length}`);
    if (p.rows.length > 0) return true;
    const m = await client.query(`SELECT id, role FROM project_members WHERE project_id=$1 AND user_id=$2`, [projectId, userId]);
    console.log(`[hasEditAccess] member check rows: ${m.rows.length}`, m.rows);
    const mEditor = await client.query(`SELECT id FROM project_members WHERE project_id=$1 AND user_id=$2 AND role='editor'`, [projectId, userId]);
    console.log(`[hasEditAccess] editor check rows: ${mEditor.rows.length}`);
    return mEditor.rows.length > 0;
}


// ─── GET /api/projects/:projectId/tasks ──────────────────────────────────────
router.get("/:projectId/tasks", async (req, res, next) => {
    const client = await pool.connect();
    try {
        // Verify project access: owner OR member
        const ownerCheck = await client.query(
            `SELECT id FROM projects WHERE id=$1 AND user_id=$2`, [req.params.projectId, req.user.id]
        );
        const memberCheck = ownerCheck.rows.length === 0
            ? await client.query(`SELECT id FROM project_members WHERE project_id=$1 AND user_id=$2`, [req.params.projectId, req.user.id])
            : { rows: [{}] };
        if (ownerCheck.rows.length === 0 && memberCheck.rows.length === 0) {
            return res.status(404).json({ error: "Project not found." });
        }

        const tasks = await client.query(
            `SELECT * FROM tasks WHERE project_id=$1 ORDER BY sort_order ASC, created_at ASC`,
            [req.params.projectId]
        );

        // Fetch all sub-items for these tasks in one query
        const taskIds = tasks.rows.map(t => t.id);
        let subItems = [];
        if (taskIds.length > 0) {
            const subRes = await client.query(
                `SELECT * FROM task_sub_items WHERE task_id = ANY($1) ORDER BY sort_order ASC, created_at ASC`,
                [taskIds]
            );
            subItems = subRes.rows;
        }

        // Attach sub_items to each task
        const result = tasks.rows.map(task => ({
            ...task,
            sub_items: subItems.filter(s => s.task_id === task.id),
        }));

        res.json(result);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── GET /api/shared-projects — projects where user is a collaborator ──────────
router.get("/shared-projects", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT p.*, pm.role AS member_role, pm.joined_at,
                    u.display_name AS owner_name, u.email AS owner_email
             FROM project_members pm
             JOIN projects p ON p.id = pm.project_id
             JOIN users u ON u.id = p.user_id
             WHERE pm.user_id=$1
             ORDER BY pm.joined_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) { next(err); }
    finally { client.release(); }
});



// ─── POST /api/projects/:projectId/tasks ─────────────────────────────────────
router.post("/:projectId/tasks", async (req, res, next) => {
    const parse = createTaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const { content, task_type, status, priority, due_date, due_time, sort_order } = parse.data;
    const client = await pool.connect();
    try {
        const allowed = await hasEditAccess(client, req.user.id, req.params.projectId);
        if (!allowed) return res.status(403).json({ error: "Access denied or project not found." });

        // Push existing tasks down if inserting at a specific position
        await client.query(
            `UPDATE tasks SET sort_order = sort_order + 1 WHERE project_id=$1 AND sort_order >= $2`,
            [req.params.projectId, sort_order]
        );

        const id = uuidv4();
        await client.query(
            `INSERT INTO tasks (id, project_id, user_id, content, task_type, status, priority, due_date, due_time, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [id, req.params.projectId, req.user.id, content, task_type, status, priority, due_date ?? null, due_time ?? null, sort_order]
        );

        await logActivity(client, req.user.id, 'task_created', req.params.projectId, id);

        const result = await client.query(`SELECT * FROM tasks WHERE id=$1`, [id]);
        res.status(201).json({ ...result.rows[0], sub_items: [] });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── PUT /api/tasks/:taskId ──────────────────────────────────────────────────
router.put("/task/:taskId", async (req, res, next) => {
    const parse = updateTaskSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT * FROM tasks WHERE id=$1`, [req.params.taskId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Task not found." });

        const t = existing.rows[0];
        if (!(await hasEditAccess(client, req.user.id, t.project_id))) {
            return res.status(403).json({ error: "Access denied." });
        }
        const wasNotDone = t.status !== 'done';

        const { content, task_type, status, priority, due_date, due_time, sort_order } = parse.data;

        await client.query(
            `UPDATE tasks SET
                content    = COALESCE($1, content),
                task_type  = COALESCE($2, task_type),
                status     = COALESCE($3, status),
                priority   = COALESCE($4, priority),
                due_date   = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE due_date END,
                due_time   = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE due_time END,
                sort_order = COALESCE($7, sort_order),
                updated_at = NOW()
             WHERE id=$8`,
            [content, task_type, status, priority, due_date, due_time, sort_order, req.params.taskId]
        );

        // Log task completion
        if (status === 'done' && wasNotDone) {
            await logActivity(client, req.user.id, 'task_completed', t.project_id, t.id);

            // Early bird: completed 3+ days before due_date
            if (t.due_date) {
                const dueTs = new Date(t.due_date).getTime();
                const now = Date.now();
                const diffDays = (dueTs - now) / (1000 * 60 * 60 * 24);
                if (diffDays >= 3) {
                    await pool.connect().then(async c => {
                        try { await c.query(`INSERT INTO user_badges (id, user_id, badge_id) VALUES ($1,$2,'badge-early-bird') ON CONFLICT DO NOTHING`, [uuidv4(), req.user.id]); }
                        finally { c.release(); }
                    });
                }
            }
        }

        const result = await client.query(`SELECT * FROM tasks WHERE id=$1`, [req.params.taskId]);
        const subItems = await client.query(`SELECT * FROM task_sub_items WHERE task_id=$1 ORDER BY sort_order ASC`, [req.params.taskId]);
        res.json({ ...result.rows[0], sub_items: subItems.rows });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── DELETE /api/tasks/:taskId ───────────────────────────────────────────────
router.delete("/task/:taskId", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT project_id FROM tasks WHERE id=$1`, [req.params.taskId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Task not found." });
        if (!(await hasEditAccess(client, req.user.id, existing.rows[0].project_id))) {
            return res.status(403).json({ error: "Access denied." });
        }
        await client.query(`DELETE FROM tasks WHERE id=$1`, [req.params.taskId]);
        res.json({ message: "Task deleted." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── PATCH /api/projects/:projectId/tasks/reorder ────────────────────────────
router.patch("/:projectId/tasks/reorder", async (req, res, next) => {
    const parse = reorderSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        const allowed = await hasEditAccess(client, req.user.id, req.params.projectId);
        if (!allowed) return res.status(403).json({ error: "Access denied." });

        await client.query("BEGIN");
        for (const { id, sort_order } of parse.data.order) {
            await client.query(`UPDATE tasks SET sort_order=$1 WHERE id=$2 AND project_id=$3`, [sort_order, id, req.params.projectId]);
        }
        await client.query("COMMIT");
        res.json({ message: "Reordered." });
    } catch (err) {
        await client.query("ROLLBACK");
        next(err);
    } finally { client.release(); }
});

// ─── POST /api/tasks/:taskId/sub-items ───────────────────────────────────────
router.post("/task/:taskId/sub-items", async (req, res, next) => {
    const parse = createSubItemSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        // Verify ownership via task
        const task = await client.query(
            `SELECT project_id FROM tasks WHERE id=$1`, [req.params.taskId]
        );
        if (task.rows.length === 0) return res.status(404).json({ error: "Task not found." });
        if (!(await hasEditAccess(client, req.user.id, task.rows[0].project_id))) {
            return res.status(403).json({ error: "Access denied." });
        }

        const { content, priority, due_date, due_time, sort_order } = parse.data;
        const id = uuidv4();
        await client.query(
            `INSERT INTO task_sub_items (id, task_id, content, priority, due_date, due_time, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [id, req.params.taskId, content, priority, due_date ?? null, due_time ?? null, sort_order]
        );
        const result = await client.query(`SELECT * FROM task_sub_items WHERE id=$1`, [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── PUT /api/sub-items/:subId ───────────────────────────────────────────────
router.put("/sub-item/:subId", async (req, res, next) => {
    const parse = updateSubItemSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.errors[0].message });

    const client = await pool.connect();
    try {
        // Ownership check via join
        const existing = await client.query(
            `SELECT t.project_id FROM task_sub_items si
             JOIN tasks t ON t.id = si.task_id
             WHERE si.id=$1`,
            [req.params.subId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Sub-item not found." });
        if (!(await hasEditAccess(client, req.user.id, existing.rows[0].project_id))) {
            return res.status(403).json({ error: "Access denied." });
        }

        const { content, priority, due_date, due_time, is_done, sort_order } = parse.data;
        await client.query(
            `UPDATE task_sub_items SET
                content    = COALESCE($1, content),
                priority   = COALESCE($2, priority),
                due_date   = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE due_date END,
                due_time   = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE due_time END,
                is_done    = COALESCE($5, is_done),
                sort_order = COALESCE($6, sort_order)
             WHERE id=$7`,
            [content, priority, due_date, due_time, is_done, sort_order, req.params.subId]
        );
        const result = await client.query(`SELECT * FROM task_sub_items WHERE id=$1`, [req.params.subId]);
        res.json(result.rows[0]);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── DELETE /api/sub-items/:subId ────────────────────────────────────────────
router.delete("/sub-item/:subId", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT t.project_id FROM task_sub_items si
             JOIN tasks t ON t.id = si.task_id
             WHERE si.id=$1`,
            [req.params.subId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ error: "Sub-item not found." });
        if (!(await hasEditAccess(client, req.user.id, existing.rows[0].project_id))) {
            return res.status(403).json({ error: "Access denied." });
        }
        await client.query(`DELETE FROM task_sub_items WHERE id=$1`, [req.params.subId]);
        res.json({ message: "Sub-item deleted." });
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── GET /api/activity/graph ─────────────────────────────────────────────────
// Returns per-day activity count for the last 52 weeks (contribution graph data)
router.get("/activity/graph", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT DATE(created_at) AS date, COUNT(*) AS count
             FROM activity_log
             WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '365 days'
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [req.user.id]
        );
        const maxCount = Math.max(...result.rows.map(r => parseInt(r.count)), 1);
        const data = result.rows.map(r => {
            const count = parseInt(r.count);
            const level = Math.min(4, Math.ceil((count / maxCount) * 4));
            return { date: r.date, count, level };
        });
        res.json(data);
    } catch (err) { next(err); }
    finally { client.release(); }
});

// ─── GET /api/activity/badges ────────────────────────────────────────────────
router.get("/activity/badges", async (req, res, next) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT b.id, b.name, b.description, b.icon, ub.earned_at
             FROM user_badges ub
             JOIN badges b ON b.id = ub.badge_id
             WHERE ub.user_id=$1
             ORDER BY ub.earned_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) { next(err); }
    finally { client.release(); }
});

export default router;
