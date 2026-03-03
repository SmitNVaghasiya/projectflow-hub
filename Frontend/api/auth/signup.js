import { query, ensureTables } from "../db.js";
import { signToken, cors } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
    if (cors(req, res)) return;
    await ensureTables();

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password, display_name, code } = req.body;
    if (!email || !password || !code) {
        return res.status(400).json({ error: "Email, password, and code are required" });
    }

    try {
        const cleanEmail = email.toLowerCase().trim();

        // 1. Check if user already exists
        const existing = await query`SELECT id FROM users WHERE email = ${cleanEmail}`;
        if (existing.length > 0) {
            return res.status(409).json({ error: "User already registered" });
        }

        // 2. Verify the OTP code
        const otpRows = await query`
            SELECT id FROM otp_codes
            WHERE email = ${cleanEmail}
            AND code = ${code}
            AND used = FALSE
            AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        `;

        if (otpRows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP code" });
        }

        // 3. Mark OTP as used
        await query`UPDATE otp_codes SET used = TRUE WHERE id = ${otpRows[0].id}`;

        // 4. Create User
        const id = uuidv4();
        const password_hash = await bcrypt.hash(password, 10);
        const name = display_name || "";

        await query`
            INSERT INTO users (id, email, password_hash, display_name, email_verified)
            VALUES (${id}, ${cleanEmail}, ${password_hash}, ${name}, TRUE)
        `;

        // 5. Sign token and log them in
        const token = signToken({ id, email: cleanEmail });
        res.status(201).json({
            token,
            user: { id, email: cleanEmail, display_name: name, user_metadata: { display_name: name } },
            message: "Account created successfully"
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: err.message });
    }
}
