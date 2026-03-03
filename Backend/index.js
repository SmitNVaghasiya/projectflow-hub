import app from "./app.js";

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// ─── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  ✅  ProjectHub API running at http://localhost:${PORT}`);
    console.log(`  🐘  Database: PostgreSQL (Neon)`);
    console.log(`  🌐  CORS allowed from: ${FRONTEND_URL}\n`);
});
