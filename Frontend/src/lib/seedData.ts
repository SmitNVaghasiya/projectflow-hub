import { apiSeedProjects } from "@/lib/api";

interface SeedProject {
    name: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    due_date: string | null;
}

const SEED_PROJECTS: SeedProject[] = [
    {
        name: "Temporary Chat Context Closer",
        description: "Temporary chat option that allows learning how to cut access to old information/context while chatting.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Proposal & Sales Deck Generator",
        description: "Generates polished proposal drafts based on a brief and previous proposals for agencies to avoid repetitive writing.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Compliance Monitor for SMEs",
        description: "Monitors policies, contracts, or website content to flag basic compliance issues (GDPR/industry rules) for small businesses.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Contract Review Assistant",
        description: "Ingests contracts (PDF/DOCX), highlights risky clauses, missing terms, and provides human-readable summaries.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "Google Nano Banana Pro Image Generator",
        description: "Website generating product images using Google Nano Banana Pro. Users upload an image and get ~15 variations. Keep a history sidebar.",
        status: "todo",
        priority: "high",
        due_date: null,
    },
    {
        name: "AI Dynamic Pricing & Discount Recommender",
        description: "Pricing engine that analyzes sales history and suggests optimal prices and discount windows.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Hyper-personalized Targeting Helper",
        description: "A tool that segments e-commerce customers and suggests highly personalized offers/content based on behavior.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI On-site Recommender & Bundling Engine",
        description: "Micro-service for small stores suggesting 'Frequently bought together' bundles and personalized product carousels.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Predictive Maintenance Dashboard",
        description: "Uses historical machine data to predict maintenance windows and visualize risk for small factories/workshops.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Supply Chain Disruption Tracker",
        description: "Tracks supplier regions, news, and logistics data to flag potential disruption risks and suggest alternatives.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "AI Personalized Learning Planner",
        description: "Creates dynamic study plans based on goals, performance, and time constraints for students and professionals.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Micro-learning & Skill Coach",
        description: "A daily micro-lesson coach for skills like coding, data analysis, or English learning.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Event Personalization & Recommendation",
        description: "Suggests events to users based on interests, history, and location.",
        status: "todo",
        priority: "low",
        due_date: null,
    },
    {
        name: "AI Agents Team for Market Research",
        description: "A crew of different AI models that supervise each other, compare concepts, search Reddit/LinkedIn/Medium, and synthesize the best business plans and competitor analysis.",
        status: "todo",
        priority: "high",
        due_date: null,
    },
    {
        name: "N8N Scrape & Summarize Workflow",
        description: "Workflow to scrape and summarize webpages with AI using n8n integrations.",
        status: "todo",
        priority: "medium",
        due_date: null,
    },
    {
        name: "N8N Generate B2B Leads Workflow",
        description: "Workflow to generate B2B lead opportunities from websites using BrightData and OpenRouter AI.",
        status: "todo",
        priority: "medium",
        due_date: null,
    }
];

export async function seedProjects(): Promise<{ count: number; error?: string }> {
    const { data, error } = await apiSeedProjects(SEED_PROJECTS);
    if (error) return { count: 0, error };
    return { count: data?.count ?? 0 };
}
