import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "projecthub-local-dev-secret-key-2024";

/**
 * Express middleware that validates the Bearer JWT token on every protected route.
 * Also checks the revoked_tokens table to block logged-out tokens.
 * Sets req.user = { id, email } and req.tokenJti on success.
 */
export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization token." });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch {
        return res.status(401).json({ error: "Invalid or expired token." });
    }

    // Check if token has been blacklisted (logged out)
    const jti = decoded.jti;
    if (jti) {
        const client = await pool.connect();
        try {
            const revoked = await client.query(
                "SELECT jti FROM revoked_tokens WHERE jti = $1",
                [jti]
            );
            if (revoked.rows.length > 0) {
                return res.status(401).json({ error: "Token has been revoked. Please log in again." });
            }
        } finally {
            client.release();
        }
    }

    req.user = decoded;
    req.tokenJti = jti;
    next();
}

/**
 * Signs a new JWT token with a unique jti for blacklisting support.
 * @param {object} payload - { id, email }
 * @returns {string} Signed JWT
 */
export function signToken(payload) {
    return jwt.sign(
        { ...payload, jti: crypto.randomUUID() },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
}
