import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import dns from "dns/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env file!");
  process.exit(1);
}

const { Pool } = pg;

// ─── Parse connection string ───────────────────────────────────────────────────
const rawUrl = process.env.DATABASE_URL;
const connUrl = new URL(rawUrl);
connUrl.searchParams.delete("channel_binding");

const HOSTNAME = connUrl.hostname;
const DB_USER = decodeURIComponent(connUrl.username);
const DB_PASS = decodeURIComponent(connUrl.password);
const DB_NAME = connUrl.pathname.replace("/", "");
const DB_PORT = connUrl.port || "5432";

// ─── Resolve hostname using Google's DNS (bypasses local ISP DNS block) ───────
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

// ─── Connect to Neon using resolved IP, with SNI set to original hostname ─────
const pool = new Pool({
  host: resolvedHost,
  port: parseInt(DB_PORT, 10),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  ssl: {
    rejectUnauthorized: false,
    servername: HOSTNAME, // Required for SNI so the TLS cert is validated correctly
  },
});

// ─── Create Tables ──────────────────────────────────────────────────────────────
const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id            TEXT PRIMARY KEY,
          email         TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name  TEXT NOT NULL DEFAULT '',
          created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS tasks (
          id          TEXT PRIMARY KEY,
          project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title       TEXT NOT NULL,
          status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    `);
    console.log("  🗄️   PostgreSQL tables ready (Neon)");
  } finally {
    client.release();
  }
};

await initDb();

export default pool;
