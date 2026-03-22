import { ApiTask } from "@/lib/api";

export const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
};

export const priorityEmoji: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };

export const statusColors: Record<string, string> = {
    todo: "bg-secondary text-secondary-foreground",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export function sortTasks(tasks: ApiTask[]) {
    const priorityWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const active = tasks.filter((t) => t.status !== "done").sort((a, b) => {
        const pw = priorityWeight[a.priority] - (priorityWeight[b.priority] || 1);
        if (pw !== 0) return pw;
        return a.sort_order - b.sort_order;
    });
    const done = tasks.filter((t) => t.status === "done");
    return { active, done };
}
