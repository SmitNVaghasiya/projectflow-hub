import pg from "pg";
import dns from "node:dns";

const { Pool } = pg;
let pool;

// ─── Resolve hostname via Google DNS (bypass ISP blocks) ─────────────────────
async function resolveHost(hostname) {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "8.8.4.4"]);
  const addresses = await resolver.resolve4(hostname);
  console.log(`  🔍  Resolved ${hostname} → ${addresses[0]}`);
  return addresses[0];
}

export async function getDb() {
  if (pool) return pool;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("channel_binding");
  const originalHost = url.hostname;
  const ip = await resolveHost(originalHost);

  pool = new Pool({
    host: ip,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: {
      rejectUnauthorized: true,
      servername: originalHost, // SNI override for TLS
    },
    max: 5,
    idleTimeoutMillis: 10000,
  });

  return pool;
}

// Helper for tagged-template-style queries
export async function query(strings, ...values) {
  const p = await getDb();
  // Build parameterized query
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + strings[i + 1];
  }
  const result = await p.query(text, values);
  return result.rows;
}

// ─── Ensure tables exist (called once per cold start) ───────────────────────
let initialized = false;
export async function ensureTables() {
  if (initialized) return;
  const p = await getDb();

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name  TEXT NOT NULL DEFAULT '',
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS projects (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        status      TEXT NOT NULL DEFAULT 'todo',
        priority    TEXT NOT NULL DEFAULT 'medium',
        due_date    TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS tasks (
        id          TEXT PRIMARY KEY,
        project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'todo',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
        id         TEXT PRIMARY KEY,
        email      TEXT NOT NULL,
        code       TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)`);
  initialized = true;
  console.log("  🗄️   PostgreSQL tables ready (Neon)");
}
