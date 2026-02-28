import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// All project routes require authentication
router.use(authenticate);

// ─── GET /api/projects ────────────────────────────────────────────────────────
router.get("/", (req, res) => {
    const projects = db
        .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
        .all(req.user.id);
    res.json(projects);
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
    const project = db
        .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
});

// ─── POST /api/projects ──────────────────────────────────────────────────────
router.post("/", (req, res) => {
    const { name, description, status, priority, due_date } = req.body;
    if (!name) return res.status(400).json({ error: "Project name is required" });

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO projects (id, user_id, name, description, status, priority, due_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        req.user.id,
        name,
        description || "",
        status || "todo",
        priority || "medium",
        due_date || null,
        now,
        now
    );

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    res.status(201).json(project);
});

// ─── POST /api/projects/seed ─────────────────────────────────────────────────
router.post("/seed", (req, res) => {
    const { projects } = req.body;
    if (!Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json({ error: "Projects array is required" });
    }

    const insert = db.prepare(`
    INSERT INTO projects (id, user_id, name, description, status, priority, due_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const now = new Date().toISOString();
    const insertMany = db.transaction((items) => {
        for (const p of items) {
            insert.run(
                uuidv4(),
                req.user.id,
                p.name,
                p.description || "",
                p.status || "todo",
                p.priority || "medium",
                p.due_date || null,
                now,
                now
            );
        }
    });

    try {
        insertMany(projects);
        res.status(201).json({ count: projects.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── PUT /api/projects/:id ───────────────────────────────────────────────────
router.put("/:id", (req, res) => {
    const existing = db
        .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
        .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: "Project not found" });

    const { name, description, status, priority, due_date } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
        name ?? null,
        description ?? null,
        status ?? null,
        priority ?? null,
        due_date !== undefined ? due_date : existing.due_date,
        now,
        req.params.id,
        req.user.id
    );

    const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    res.json(updated);
});

// ─── DELETE /api/projects/:id ────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db
        .prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
        .run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: "Project not found" });
    res.json({ message: "Project deleted" });
});

export default router;
