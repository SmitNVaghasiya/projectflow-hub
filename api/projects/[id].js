import { query, ensureTables } from "../db.js";
import { authenticate, cors } from "../middleware/auth.js";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    await ensureTables();

    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.query;

    if (req.method === "GET") {
        try {
            const rows = await query`SELECT * FROM projects WHERE id = ${id} AND user_id = ${user.id}`;
            if (rows.length === 0) return res.status(404).json({ error: "Project not found" });
            return res.json(rows[0]);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === "PUT") {
        try {
            const existing = await query`SELECT * FROM projects WHERE id = ${id} AND user_id = ${user.id}`;
            if (existing.length === 0) return res.status(404).json({ error: "Project not found" });
            const p = existing[0];
            const { name, description, status, priority, due_date } = req.body;
            await query`
        UPDATE projects SET
          name = ${name ?? p.name},
          description = ${description ?? p.description},
          status = ${status ?? p.status},
          priority = ${priority ?? p.priority},
          due_date = ${due_date !== undefined ? due_date : p.due_date},
          updated_at = NOW()
        WHERE id = ${id} AND user_id = ${user.id}
      `;
            const updated = await query`SELECT * FROM projects WHERE id = ${id}`;
            return res.json(updated[0]);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === "DELETE") {
        try {
            const result = await query`DELETE FROM projects WHERE id = ${id} AND user_id = ${user.id} RETURNING id`;
            if (result.length === 0) return res.status(404).json({ error: "Project not found" });
            return res.json({ message: "Project deleted" });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
