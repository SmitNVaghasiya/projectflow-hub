// Centralized API client for the ProjectHub backend
const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

export async function apiSignup(email: string, password: string, display_name: string, code: string) {
    const result = await apiFetch<{ token: string; user: ApiUser }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name, code }),
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

// ─── OTP API ────────────────────────────────────────────────────────────────
export async function apiSendOtp(email: string, context?: "signup" | "reset") {
    return apiFetch<{ message: string }>("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email, context }),
    });
}

export async function apiResetPassword(email: string, code: string, newPassword: string) {
    return apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
    });
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

export async function apiVerifyOtp(email: string, code: string) {
    const result = await apiFetch<{ message: string; verified: boolean; token?: string; user?: ApiUser }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, code }),
    });
    if (result.data?.token) {
        setToken(result.data.token);
    }
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

// ─── Tasks API ───────────────────────────────────────────────────────────────
export interface ApiSubItem {
    id: string;
    task_id: string;
    content: string;
    priority: "low" | "medium" | "high";
    due_date: string | null;
    due_time: string | null;
    is_done: boolean;
    sort_order: number;
    created_at: string;
}

export interface ApiTask {
    id: string;
    project_id: string;
    user_id: string;
    content: string;
    task_type: "simple" | "complex";
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    due_date: string | null;
    due_time: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    sub_items: ApiSubItem[];
}

export async function apiGetTasks(projectId: string) {
    return apiFetch<ApiTask[]>(`/projects/${projectId}/tasks`);
}

export async function apiCreateTask(
    projectId: string,
    task: {
        content: string;
        task_type?: "simple" | "complex";
        status?: string;
        priority?: string;
        due_date?: string | null;
        due_time?: string | null;
        sort_order?: number;
    }
) {
    return apiFetch<ApiTask>(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify(task),
    });
}

export async function apiUpdateTask(
    taskId: string,
    updates: Partial<Omit<ApiTask, "id" | "project_id" | "user_id" | "created_at" | "sub_items">>
) {
    return apiFetch<ApiTask>(`/task/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function apiDeleteTask(taskId: string) {
    return apiFetch(`/task/${taskId}`, { method: "DELETE" });
}

export async function apiReorderTasks(
    projectId: string,
    order: Array<{ id: string; sort_order: number }>
) {
    return apiFetch(`/projects/${projectId}/tasks/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ order }),
    });
}

// ─── Sub-items API ───────────────────────────────────────────────────────────
export async function apiCreateSubItem(
    taskId: string,
    subItem: {
        content: string;
        priority?: string;
        due_date?: string | null;
        due_time?: string | null;
        sort_order?: number;
    }
) {
    return apiFetch<ApiSubItem>(`/task/${taskId}/sub-items`, {
        method: "POST",
        body: JSON.stringify(subItem),
    });
}

export async function apiUpdateSubItem(
    subId: string,
    updates: Partial<Omit<ApiSubItem, "id" | "task_id" | "created_at">>
) {
    return apiFetch<ApiSubItem>(`/sub-item/${subId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function apiDeleteSubItem(subId: string) {
    return apiFetch(`/sub-item/${subId}`, { method: "DELETE" });
}

// ─── Activity + Badges API ───────────────────────────────────────────────────
export interface ActivityDay {
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
}

export interface ApiBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned_at: string;
}

export async function apiGetActivityGraph() {
    return apiFetch<ActivityDay[]>("/activity/graph");
}

export async function apiGetBadges() {
    return apiFetch<ApiBadge[]>("/activity/badges");
}

// ─── Collaboration — Members ─────────────────────────────────────────────────
export interface ApiMember {
    id: string;
    role: "editor" | "viewer";
    joined_at: string;
    user_id: string;
    email: string;
    display_name: string;
}

export async function apiGetProjectMembers(projectId: string) {
    return apiFetch<{ owner: { user_id: string; email: string; display_name: string }; members: ApiMember[] }>(
        `/projects/${projectId}/members`
    );
}

export async function apiInviteMember(projectId: string, email: string, role: "editor" | "viewer") {
    return apiFetch<{ message: string }>(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
    });
}

export async function apiUpdateMemberRole(projectId: string, memberId: string, role: "editor" | "viewer") {
    return apiFetch<{ message: string }>(`/projects/${projectId}/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({ role }),
    });
}

export async function apiRemoveMember(projectId: string, memberId: string) {
    return apiFetch(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
}

// ─── Collaboration — Comments ────────────────────────────────────────────────
export interface ApiComment {
    id: string;
    content: string;
    task_id: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
    display_name: string;
    email: string;
}

export async function apiGetComments(projectId: string, taskId?: string) {
    const qs = taskId ? `?task_id=${taskId}` : "";
    return apiFetch<ApiComment[]>(`/projects/${projectId}/comments${qs}`);
}

export async function apiCreateComment(projectId: string, content: string, taskId?: string | null) {
    return apiFetch<ApiComment>(`/projects/${projectId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, task_id: taskId ?? null }),
    });
}

export async function apiUpdateComment(commentId: string, content: string) {
    return apiFetch<ApiComment>(`/comment/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
    });
}

export async function apiDeleteComment(commentId: string) {
    return apiFetch(`/comment/${commentId}`, { method: "DELETE" });
}

// ─── Custom Statuses ─────────────────────────────────────────────────────────
export interface ApiCustomStatus {
    id: string;
    user_id: string;
    name: string;
    color: string;
    sort_order: number;
    created_at: string;
}

export async function apiGetCustomStatuses() {
    return apiFetch<ApiCustomStatus[]>("/statuses");
}

export async function apiCreateCustomStatus(name: string, color: string) {
    return apiFetch<ApiCustomStatus>("/statuses", {
        method: "POST",
        body: JSON.stringify({ name, color }),
    });
}

export async function apiUpdateCustomStatus(id: string, updates: Partial<Pick<ApiCustomStatus, "name" | "color" | "sort_order">>) {
    return apiFetch<ApiCustomStatus>(`/statuses/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function apiDeleteCustomStatus(id: string) {
    return apiFetch(`/statuses/${id}`, { method: "DELETE" });
}

// ─── Shared / Collaborative Projects ─────────────────────────────────────────
export interface ApiSharedProject {
    id: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    member_role: "editor" | "viewer";
    joined_at: string;
    owner_name: string;
    owner_email: string;
}

export async function apiGetSharedProjects() {
    return apiFetch<ApiSharedProject[]>("/shared-projects");
}
