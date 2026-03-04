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

    // Tasks table — evolved schema (ALTER adds new cols to existing DBs)
    await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id           TEXT PRIMARY KEY,
                project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
                content      TEXT NOT NULL DEFAULT '',
                task_type    TEXT NOT NULL DEFAULT 'simple',
                status       TEXT NOT NULL DEFAULT 'todo',
                priority     TEXT NOT NULL DEFAULT 'medium',
                due_date     TEXT,
                due_time     TEXT,
                sort_order   INTEGER NOT NULL DEFAULT 0,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'simple';`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TEXT;`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT;`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
    // Drop NOT NULL on old `title` column so new content-based inserts work
    await client.query(`ALTER TABLE tasks ALTER COLUMN title DROP NOT NULL;`).catch(() => { });
    // Ensure content is never null — copy title→content for old rows
    await client.query(`UPDATE tasks SET content = COALESCE(NULLIF(content,''), title, 'Untitled') WHERE content = '' OR content IS NULL;`).catch(() => { });

    // Task sub-items (for complex tasks)
    await client.query(`
            CREATE TABLE IF NOT EXISTS task_sub_items (
                id         TEXT PRIMARY KEY,
                task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                content    TEXT NOT NULL DEFAULT '',
                priority   TEXT NOT NULL DEFAULT 'medium',
                due_date   TEXT,
                due_time   TEXT,
                is_done    BOOLEAN NOT NULL DEFAULT FALSE,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Activity log (feeds contribution graph + badge triggers)
    await client.query(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action_type TEXT NOT NULL,
                project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
                task_id     TEXT REFERENCES tasks(id) ON DELETE SET NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Badges (static definitions seeded below)
    await client.query(`
            CREATE TABLE IF NOT EXISTS badges (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL,
                description  TEXT NOT NULL,
                icon         TEXT NOT NULL,
                trigger_type TEXT NOT NULL
            );
        `);
    const badgeRows = [
      ['badge-first-launch', 'First Launch', 'Created your first project', '\u{1F680}', 'project_created_first'],
      ['badge-first-win', 'First Win', 'Completed your first task', '\u2705', 'task_completed_first'],
      ['badge-on-time', 'On Time', 'Completed a project before its deadline', '\u23F0', 'project_on_time'],
      ['badge-milestone-5', 'Milestone 5', '5 projects completed', '\u{1F525}', 'projects_done_5'],
      ['badge-milestone-10', 'Milestone 10', '10 projects completed', '\u{1F48E}', 'projects_done_10'],
      ['badge-speed-run', 'Speed Run', 'Project done within 24h of creation', '\u26A1', 'project_speed_run'],
      ['badge-deep-planner', 'Deep Planner', '10+ tasks in a single project', '\u{1F4CB}', 'tasks_in_project_10'],
      ['badge-full-sweep', 'Full Sweep', 'All tasks done before project deadline', '\u{1F3AF}', 'project_full_sweep'],
      ['badge-consistent', 'Consistent', 'Active 7 days in a row', '\u{1F4C5}', 'streak_7'],
      ['badge-streak-master', 'Streak Master', 'Active 30 days in a row', '\u{1F31F}', 'streak_30'],
      ['badge-early-bird', 'Early Bird', 'Task completed 3+ days before due date', '\u{1F426}', 'task_early_3'],
      ['badge-all-rounder', 'All-Rounder', 'Earned 5 different badges', '\u{1F3C6}', 'badges_earned_5'],
    ];
    for (const [id, name, description, icon, trigger_type] of badgeRows) {
      await client.query(
        `INSERT INTO badges (id, name, description, icon, trigger_type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [id, name, description, icon, trigger_type]
      );
    }

    // User earned badges
    await client.query(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id         TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                badge_id   TEXT NOT NULL REFERENCES badges(id),
                earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                UNIQUE(user_id, badge_id)
            );
        `);

    // OTP codes table
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

    // Revoked tokens table
    await client.query(`
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti        TEXT PRIMARY KEY,
                revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Project members (team sharing)
    await client.query(`
            CREATE TABLE IF NOT EXISTS project_members (
                id         TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role       TEXT NOT NULL DEFAULT 'viewer',
                invited_by TEXT REFERENCES users(id),
                joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(project_id, user_id)
            );
        `);

    // Comments (per project or per task)
    await client.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id         TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                task_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content    TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Custom statuses (per user)
    await client.query(`
            CREATE TABLE IF NOT EXISTS custom_statuses (
                id         TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name       TEXT NOT NULL,
                color      TEXT NOT NULL DEFAULT '#6366f1',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    // Indexes
    await client.query(`
            CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_project_id    ON tasks(project_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_sort_order    ON tasks(project_id, sort_order);
            CREATE INDEX IF NOT EXISTS idx_sub_items_task_id   ON task_sub_items(task_id);
            CREATE INDEX IF NOT EXISTS idx_activity_user_date  ON activity_log(user_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_user_badges_user    ON user_badges(user_id);
            CREATE INDEX IF NOT EXISTS idx_project_members     ON project_members(project_id);
            CREATE INDEX IF NOT EXISTS idx_comments_project    ON comments(project_id);
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
