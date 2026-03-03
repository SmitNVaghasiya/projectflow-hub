import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import dns from "dns/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load env from same directory as this file ──────────────────────────────
config({ path: path.resolve(__dirname, ".env") });

// ─── Validate required environment variables on startup ─────────────────────
const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`❌  Missing required env var: ${v}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("❌  JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

const { Pool } = pg;

// ─── Parse Neon connection string ────────────────────────────────────────────
const rawUrl = process.env.DATABASE_URL;
const connUrl = new URL(rawUrl);
connUrl.searchParams.delete("channel_binding");

const HOSTNAME = connUrl.hostname;
const DB_USER = decodeURIComponent(connUrl.username);
const DB_PASS = decodeURIComponent(connUrl.password);
const DB_NAME = connUrl.pathname.replace("/", "");
const DB_PORT = connUrl.port || "5432";

// ─── Resolve hostname via Google DNS (bypasses ISP DNS blocks) ───────────────
let resolvedHost = HOSTNAME;
try {
  const resolver = new dns.Resolver();
  resolver.setServers(["8.8.8.8", "8.8.4.4"]);
  const addresses = await resolver.resolve4(HOSTNAME);
  resolvedHost = addresses[0];
  console.log(`  🔍  Resolved ${HOSTNAME} → ${resolvedHost}`);
} catch (err) {
  console.warn(`  ⚠️   DNS resolve failed (${err.message}), using hostname directly`);
}

// ─── Connection pool (Neon requires ssl: rejectUnauthorized: false) ──────────
const pool = new Pool({
  host: resolvedHost,
  port: parseInt(DB_PORT, 10),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Required for Neon PostgreSQL
    servername: HOSTNAME,      // SNI override so TLS cert validates correctly
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
const closePool = async () => {
  await pool.end();
  console.log("  🛑  Database pool closed");
};
process.on("SIGTERM", closePool);
process.on("SIGINT", closePool);

// ─── Create all tables on startup ────────────────────────────────────────────
/**
 * Initialises all required tables if they don't exist.
 * Safe to call multiple times (uses CREATE TABLE IF NOT EXISTS).
 */
const initDb = async () => {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY,
                email           TEXT UNIQUE NOT NULL,
                password_hash   TEXT NOT NULL,
                display_name    TEXT NOT NULL DEFAULT '',
                email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Add email_verified column if this is an existing DB that didn't have it
    await client.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        `);

    // Projects table
    await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name        TEXT NOT NULL,
                description TEXT DEFAULT '',
                status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
                priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
                due_date    TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Tasks table
    await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                title       TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // OTP codes table (for email verification on signup)
    await client.query(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id         TEXT PRIMARY KEY,
                email      TEXT NOT NULL,
                code       TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used       BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Revoked tokens table (for logout / JWT blacklisting)
    await client.query(`
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti        TEXT PRIMARY KEY,
                revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Indexes
    await client.query(`
            CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_project_id    ON tasks(project_id);
            CREATE INDEX IF NOT EXISTS idx_otp_email           ON otp_codes(email);
            CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti  ON revoked_tokens(jti);
        `);

    console.log("  🗄️   PostgreSQL tables ready (Neon)");
  } finally {
    client.release();
  }
};

await initDb();

export default pool;
