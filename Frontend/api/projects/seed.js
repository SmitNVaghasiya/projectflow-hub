import { query, ensureTables } from "../db.js";
import { authenticate, cors } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    await ensureTables();

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { projects } = req.body;
    if (!Array.isArray(projects) || projects.length === 0) {
        return res.status(400).json({ error: "Projects array is required" });
    }

    try {
        for (const p of projects) {
            await query`
        INSERT INTO projects (id, user_id, name, description, status, priority, due_date)
        VALUES (${uuidv4()}, ${user.id}, ${p.name}, ${p.description || ""}, ${p.status || "todo"}, ${p.priority || "medium"}, ${p.due_date || null})
      `;
        }
        res.status(201).json({ count: projects.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
