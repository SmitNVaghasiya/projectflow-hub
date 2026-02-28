import { query, ensureTables } from "../db.js";
import { authenticate, cors } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    await ensureTables();

    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (req.method === "GET") {
        try {
            const rows = await query`SELECT * FROM projects WHERE user_id = ${user.id} ORDER BY created_at DESC`;
            return res.json(rows);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === "POST") {
        const { name, description, status, priority, due_date } = req.body;
        if (!name) return res.status(400).json({ error: "Project name is required" });
        const id = uuidv4();
        try {
            await query`
        INSERT INTO projects (id, user_id, name, description, status, priority, due_date)
        VALUES (${id}, ${user.id}, ${name}, ${description || ""}, ${status || "todo"}, ${priority || "medium"}, ${due_date || null})
      `;
            const rows = await query`SELECT * FROM projects WHERE id = ${id}`;
            return res.status(201).json(rows[0]);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
