import http from "http";

const projects = [
    { name: "Task Tracker App (This App!)", description: "Tier 1 — A simple project & task manager to track all your AI/ML projects.", status: "in_progress", priority: "high" },
    { name: "LinkedIn / Fiverr Engagement Tool", description: "Tier 1 — Build audience on LinkedIn, Fiverr, and Reddit for your portfolio.", status: "todo", priority: "high" },
    { name: "RAG Memory System for LLMs", description: "Tier 1 — RAG memory system so LLMs access past data without huge context windows.", status: "todo", priority: "high" },
    { name: "AI Code Quality Checker", description: "Tier 1 — AI analysis to flag code smells, suggest refactors, and generate docs.", status: "todo", priority: "high" },
    { name: "AI Review Analysis Dashboard", description: "Tier 2 — Sentiment analysis on customer reviews. Fiverr gig ready.", status: "todo", priority: "high" },
    { name: "AI Product Description Generator", description: "Tier 2 — Upload CSV, get SEO-optimized product descriptions. E-commerce sellers love it.", status: "todo", priority: "high" },
    { name: "AI Email Triage & Reply Assistant", description: "Tier 2 — Categorizes emails and drafts smart replies. High demand automation.", status: "todo", priority: "medium" },
    { name: "AI Customer Support Macro Creator", description: "Tier 2 — Generates reply templates from past support tickets.", status: "todo", priority: "medium" },
    { name: "AI Keyword Clustering + Content Brief", description: "Tier 2 — Clusters keywords into topics, generates SEO content briefs.", status: "todo", priority: "medium" },
    { name: "AI Internal Semantic Search", description: "Tier 3 — AI-powered search that understands user intent. Shows RAG knowledge.", status: "todo", priority: "medium" },
    { name: "AI Audience Monitoring & Lead Alert", description: "Tier 3 — Tracks forums for keywords, alerts when target problems are discussed.", status: "todo", priority: "medium" },
    { name: "AI Employee Feedback Analyzer", description: "Tier 3 — Sentiment breakdowns from anonymous survey feedback. B2B niche.", status: "todo", priority: "medium" },
    { name: "AI Analytics Explainer", description: "Tier 3 — Reads GA data, generates plain-English weekly summaries.", status: "todo", priority: "medium" },
    { name: "AI Content Planner & Repurposer", description: "Tier 3 — One content piece → social posts, emails, thread outlines.", status: "todo", priority: "medium" },
    { name: "AI Ad Creative & Copy Optimizer", description: "Tier 3 — Import ad data, generate better headlines by predicted performance.", status: "todo", priority: "medium" },
    { name: "AI Appointment & Reminder Bot", description: "Tier 4 — Booking bot for clinics/salons via chat or WhatsApp.", status: "todo", priority: "low" },
    { name: "AI Price Optimization Tool", description: "Tier 4 — Suggests optimal prices from past sales data.", status: "todo", priority: "low" },
    { name: "AI Inventory & Demand Forecasting", description: "Tier 4 — Demand forecasts and reorder suggestions from sales CSV.", status: "todo", priority: "low" },
    { name: "AI Script & Content System", description: "Tier 4 — Topic + bullets → video scripts, titles, social clips.", status: "todo", priority: "low" },
    { name: "Document Manager Mobile App", description: "Tier 4 — Netflix-style family document sharing in Flutter/React Native.", status: "todo", priority: "low" },
];

function post(path, data, token) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const opts = {
            hostname: "localhost", port: 3001, path, method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        };
        const req = http.request(opts, (res) => {
            let d = "";
            res.on("data", (c) => (d += c));
            res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: "localhost", port: 3001, path,
            headers: token ? { Authorization: "Bearer " + token } : {},
        };
        http.get(opts, (res) => {
            let d = "";
            res.on("data", (c) => (d += c));
            res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
        }).on("error", reject);
    });
}

async function main() {
    // Login
    const login = await post("/api/auth/login", { email: "smit@projecthub.dev", password: "ProjectHub@123" });
    if (!login.body.token) {
        console.error("Login failed:", login.body);
        process.exit(1);
    }
    const token = login.body.token;
    console.log("✅ Logged in as:", login.body.user.email);

    // Seed projects
    const seed = await post("/api/projects/seed", { projects }, token);
    console.log("✅ Seeded:", seed.body.count, "projects");

    // Check total
    const all = await get("/api/projects", token);
    console.log("✅ Total projects now:", all.body.length);
    all.body.forEach((p, i) => console.log(`  ${i + 1}. [${p.priority}] ${p.name} (${p.status})`));

    console.log("\n🎉 Done! Refresh the browser to see all projects.");
}

main().catch(console.error);
