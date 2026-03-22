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

// Schema initialization moved to scripts/migrate.js

export default pool;
