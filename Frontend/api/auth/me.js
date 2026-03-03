import { query, ensureTables } from "../db.js";
import { authenticate, cors } from "../middleware/auth.js";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    await ensureTables();

    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    // ─── GET /api/auth/me ─────────────────────────────────────────────────────
    if (req.method === "GET") {
        try {
            const rows = await query`SELECT id, email, display_name, created_at FROM users WHERE id = ${user.id}`;
            if (rows.length === 0) return res.status(404).json({ error: "User not found" });
            const u = rows[0];
            return res.json({
                id: u.id, email: u.email, display_name: u.display_name,
                user_metadata: { display_name: u.display_name }, created_at: u.created_at,
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ─── PUT /api/auth/me ─────────────────────────────────────────────────────
    if (req.method === "PUT") {
        const { display_name } = req.body;
        try {
            if (display_name !== undefined) {
                await query`UPDATE users SET display_name = ${display_name} WHERE id = ${user.id}`;
            }
            const rows = await query`SELECT id, email, display_name FROM users WHERE id = ${user.id}`;
            const u = rows[0];
            return res.json({ id: u.id, email: u.email, display_name: u.display_name, user_metadata: { display_name: u.display_name } });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // ─── DELETE /api/auth/me ──────────────────────────────────────────────────
    if (req.method === "DELETE") {
        try {
            await query`DELETE FROM users WHERE id = ${user.id}`;
            return res.json({ message: "Account deleted" });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
