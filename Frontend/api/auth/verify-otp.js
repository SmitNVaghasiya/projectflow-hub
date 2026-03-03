import { query, ensureTables } from "../db.js";
import { signToken, cors } from "../middleware/auth.js";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    await ensureTables();

    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

    try {
        const rows = await query`
      SELECT * FROM otp_codes
      WHERE email = ${email.toLowerCase().trim()}
        AND code = ${code}
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

        if (rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP code" });
        }

        await query`UPDATE otp_codes SET used = TRUE WHERE id = ${rows[0].id}`;
        await query`UPDATE users SET email_verified = TRUE WHERE email = ${email.toLowerCase().trim()}`;

        // Fetch user completely to generate token
        const userRows = await query`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
        const user = userRows[0];
        const token = signToken({ id: user.id, email: user.email });

        res.json({
            message: "Email verified successfully",
            verified: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                user_metadata: { display_name: user.display_name }
            }
        });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ error: err.message });
    }
}
