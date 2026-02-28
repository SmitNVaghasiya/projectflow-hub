import { apiSeedProjects } from "@/lib/api";

interface SeedProject {
    name: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    due_date: string | null;
}

const SEED_PROJECTS: SeedProject[] = [
    // ─── TIER 1: Foundation ─────────────────────────────────────────────────────
    {
        name: "Task Tracker App (This App!)",
        description:
            "Tier 1 — A simple project & task manager to track all your AI/ML projects. You need this to manage everything else. Ship in 1 week.",
        status: "in_progress",
        priority: "high",
        due_date: null,
    },
    {
        name: "LinkedIn / Fiverr Engagement Tool",
        description:
            "Tier 1 — A tool to help increase engagement on LinkedIn, Fiverr, and Reddit so you can build an audience for your portfolio projects. Audience building starts now, runs in background.",
        status: "todo",
        priority: "high",
        due_date: null,
    },
    {
        name: "RAG Memory System for LLMs",
        description:
            "Tier 1 — An efficient Retrieval-Augmented Generation (RAG) memory system so LLMs can access your past conversations and data without needing huge context windows. Personal use + strongest AI portfolio piece.",
        status: "todo",
        priority: "high",
        due_date: null,
    },
    {
        name: "AI Code Quality Checker",
        description:
            "Tier 1 — Runs your code repos through AI analysis to flag code smells, suggest refactors, and generate documentation. You'll use this on every other project you build.",
        status: "todo",
        priority: "high",
        due_date: null,
    },

    // ─── TIER 2: First Money Projects ───────────────────────────────────────────
    {
        name: "AI Review Analysis Dashboard",
        description:
            "Tier 2 / Fiverr Gig — Aggregates product or app reviews, runs sentiment analysis and topic modeling, and shows what customers like/hate in a simple dashboard. Fiverr angle: 'I'll analyze your customer reviews with AI.'",
        status: "todo",
        priority: "high",
        due_date: null,
    },
    {
        name: "AI Product Description Generator",
        description:
            "Tier 2 / Fiverr Gig — Upload a messy supplier CSV and get clean, SEO-optimized product titles, bullets, and descriptions back. E-commerce sellers love this.",
        status: "todo",
        priority: "high",
        due_date: null,
    },
    {
        name: "AI Email Triage & Reply Assistant",
        description:
            "Tier 2 / Fiverr Gig — An AI system that categorizes incoming emails (priority, support, sales) and drafts smart replies that clients can approve. Business automation gig — high demand, easy to demo.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Customer Support Macro Creator",
        description:
            "Tier 2 / Fiverr Gig — Analyzes a company's past support tickets and automatically generates a library of reply templates and canned responses. Give companies ticket templates — pure automation niche.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Keyword Clustering + Content Brief",
        description:
            "Tier 2 / Fiverr Gig — Takes a large keyword list, clusters them into topics, and generates SEO content briefs with headings, FAQs, and internal link suggestions. SEO agencies pay well, Python + CSV workflow fits your skills perfectly.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },

    // ─── TIER 3: Portfolio / Sellable Products ───────────────────────────────────
    {
        name: "AI Internal Semantic Search",
        description:
            "Tier 3 — Replaces basic keyword search on websites and docs with AI-powered search that understands user intent. Shows advanced RAG knowledge. Great for B2B demos.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Audience Monitoring & Lead Alert Tool",
        description:
            "Tier 3 — Tracks Reddit, LinkedIn, Twitter, and forums for specific keywords and alerts clients when their target problems are being discussed. Scraping + NLP + alerts. Good automation showcase.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Employee Feedback Analyzer",
        description:
            "Tier 3 — Takes anonymous survey/free-text feedback and produces sentiment breakdowns, topic clusters, and management suggestions. Not many devs target this — strong B2B angle.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Analytics Explainer",
        description:
            "Tier 3 — Reads Google Analytics / marketing dashboards and generates a plain-English weekly summary explaining what happened and what to do next. Businesses love it.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Content Planner & Repurposer",
        description:
            "Tier 3 — Upload a long piece (blog, video transcript) and auto-generate social posts, email subject lines, thread outlines, and more. Personal use first, then sell it.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Ad Creative & Copy Optimizer",
        description:
            "Tier 3 — Import past Facebook/Google ad performance data and generate new headline + creative ideas ranked by predicted performance. High perceived value for clients.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },

    // ─── TIER 4: Later Stage ────────────────────────────────────────────────────
    {
        name: "AI Appointment & Reminder Bot",
        description:
            "Tier 4 — A bot for clinics, salons, coaching etc. that handles FAQs, booking, and reminders via website chat or WhatsApp. Good but needs a client relationship to set up properly.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Price Optimization Tool",
        description:
            "Tier 4 — Analyzes past sales history and suggests optimal prices and discount windows per product category. Needs real sales data from clients to be useful.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Inventory & Demand Forecasting",
        description:
            "Tier 4 — Upload past sales CSV and get demand forecasts, reorder suggestions, and what-if scenarios for small retailers. Data-hungry — build when you have paying clients.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Script & Content System (YouTube/Podcast)",
        description:
            "Tier 4 — Takes a topic + bullet points and outputs video scripts, titles, descriptions, and social clip ideas. Personal use first, product later.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "Document Manager Mobile App",
        description:
            "Tier 4 (Wildcard) — Netflix-style family document sharing app built in Flutter/React Native. A personal passion project — treat it separately. Start only after projects 1-9 are shipped and you have Fiverr reviews. Your friend should handle most of this one since it's frontend-heavy.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
];

export async function seedProjects(): Promise<{ count: number; error?: string }> {
    const { data, error } = await apiSeedProjects(SEED_PROJECTS);
    if (error) return { count: 0, error };
    return { count: data?.count ?? 0 };
}
