import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetProjects, apiCreateProject, apiUpdateProject, apiDeleteProject, type ApiProject } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Re-export types for use in components
export type Project = ApiProject;
export type ProjectStatus = "todo" | "in_progress" | "done";
export type ProjectPriority = "low" | "medium" | "high";

export function useProjects() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ["projects", user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await apiGetProjects();
            if (error) throw new Error(error);
            return (data ?? []) as Project[];
        },
    });

    const createProject = useMutation({
        mutationFn: async (input: {
            name: string;
            description?: string;
            status?: ProjectStatus;
            priority?: ProjectPriority;
            due_date?: string | null;
        }) => {
            const { data, error } = await apiCreateProject(input);
            if (error) throw new Error(error);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project created!");
        },
        onError: (err: any) => {
            toast.error("Failed to create project: " + err.message);
        },
    });

    const updateProject = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
            const { data, error } = await apiUpdateProject(id, updates);
            if (error) throw new Error(error);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project updated!");
        },
        onError: (err: any) => {
            toast.error("Failed to update project: " + err.message);
        },
    });

    const deleteProject = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await apiDeleteProject(id);
            if (error) throw new Error(error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project deleted.");
        },
        onError: (err: any) => {
            toast.error("Failed to delete project: " + err.message);
        },
    });

    // Derived stats
    const stats = {
        total: projects.length,
        completed: projects.filter((p) => p.status === "done").length,
        inProgress: projects.filter((p) => p.status === "in_progress").length,
        overdue: projects.filter((p) => {
            if (!p.due_date || p.status === "done") return false;
            return new Date(p.due_date) < new Date();
        }).length,
        progressPercent: projects.length
            ? Math.round(
                (projects.filter((p) => p.status === "done").length / projects.length) * 100
            )
            : 0,
    };

    return { projects, isLoading, stats, createProject, updateProject, deleteProject };
}
