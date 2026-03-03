import { query, ensureTables } from "../db.js";
import { signToken, cors } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    await ensureTables();

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();
        const rows = await query`SELECT * FROM users WHERE email = ${cleanEmail}`;
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (!user.email_verified) {
            return res.status(403).json({ error: "Please verify your email to continue", requires_otp: true });
        }

        const token = signToken({ id: user.id, email: user.email });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                user_metadata: { display_name: user.display_name },
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
}
