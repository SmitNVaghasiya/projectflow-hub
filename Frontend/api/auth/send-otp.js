import { query, ensureTables } from "../db.js";
import { cors } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  await ensureTables();

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const existing = await query`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    await query`UPDATE otp_codes SET used = TRUE WHERE email = ${email.toLowerCase().trim()} AND used = FALSE`;
    await query`INSERT INTO otp_codes (id, email, code, expires_at) VALUES (${id}, ${email.toLowerCase().trim()}, ${code}, ${expiresAt.toISOString()})`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"ProjectHub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your ProjectHub Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #1a1a2e; color: #fff; border-radius: 12px;">
          <h2 style="color: #8b5cf6; margin-top: 0;">ProjectHub</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #16213e; border-radius: 8px; color: #8b5cf6;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #888; margin-top: 16px;">This code expires in 5 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP. Check SMTP config." });
  }
}
