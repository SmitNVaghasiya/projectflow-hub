// Centralized API client for the ProjectHub Node.js backend
const API_BASE = "http://localhost:3001/api";

// ─── Token Management ───────────────────────────────────────────────────────
function getToken(): string | null {
    return localStorage.getItem("projecthub_token");
}

export function setToken(token: string): void {
    localStorage.setItem("projecthub_token", token);
}

export function clearToken(): void {
    localStorage.removeItem("projecthub_token");
}

// ─── Fetch Wrapper ──────────────────────────────────────────────────────────
async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
            return { data: null, error: body?.error || `Request failed (${res.status})` };
        }
        return { data: body as T, error: null };
    } catch (err: any) {
        return { data: null, error: err.message || "Network error" };
    }
}

// ─── Auth API ───────────────────────────────────────────────────────────────
export interface ApiUser {
    id: string;
    email: string;
    display_name: string;
    user_metadata: { display_name: string };
}

export async function apiSignup(email: string, password: string, display_name: string) {
    const result = await apiFetch<{ token: string; user: ApiUser }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name }),
    });
    if (result.data?.token) {
        setToken(result.data.token);
    }
    return result;
}

export async function apiLogin(email: string, password: string) {
    const result = await apiFetch<{ token: string; user: ApiUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    if (result.data?.token) {
        setToken(result.data.token);
    }
    return result;
}

export async function apiGetMe() {
    return apiFetch<ApiUser>("/auth/me");
}

export async function apiUpdateMe(updates: { display_name?: string }) {
    return apiFetch<ApiUser>("/auth/me", {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function apiDeleteAccount() {
    const result = await apiFetch("/auth/me", { method: "DELETE" });
    clearToken();
    return result;
}

// ─── Projects API ───────────────────────────────────────────────────────────
export interface ApiProject {
    id: string;
    user_id: string;
    name: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    due_date: string | null;
    created_at: string;
    updated_at: string;
}

export async function apiGetProjects() {
    return apiFetch<ApiProject[]>("/projects");
}

export async function apiCreateProject(project: {
    name: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string | null;
}) {
    return apiFetch<ApiProject>("/projects", {
        method: "POST",
        body: JSON.stringify(project),
    });
}

export async function apiUpdateProject(
    id: string,
    updates: Partial<Omit<ApiProject, "id" | "user_id" | "created_at">>
) {
    return apiFetch<ApiProject>(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function apiDeleteProject(id: string) {
    return apiFetch(`/projects/${id}`, { method: "DELETE" });
}

export async function apiSeedProjects(
    projects: Array<{
        name: string;
        description?: string;
        status?: string;
        priority?: string;
        due_date?: string | null;
    }>
) {
    return apiFetch<{ count: number }>("/projects/seed", {
        method: "POST",
        body: JSON.stringify({ projects }),
    });
}
