import { useQuery } from "@tanstack/react-query";
import { apiGetCustomStatuses, type ApiCustomStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface StatusConfig {
  label: string;
  class?: string;
  color?: string;
  isCustom?: boolean;
}

export const DEFAULT_STATUSES: Record<string, StatusConfig> = {
  todo: { label: "To Do", class: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  in_progress: { label: "In Progress", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "Completed", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  archived: { label: "Archived", class: "bg-muted text-muted-foreground" },
};

export function useCustomStatuses() {
  const { user } = useAuth();

  const { data: customStatuses = [], isLoading } = useQuery({
    queryKey: ["custom-statuses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await apiGetCustomStatuses();
      if (error) throw new Error(error);
      return data ?? [];
    },
  });

  const getMergedStatuses = (): Record<string, StatusConfig> => {
    const merged: Record<string, StatusConfig> = { ...DEFAULT_STATUSES };
    customStatuses.forEach((s) => {
      merged[s.id] = {
        label: s.name,
        color: s.color,
        isCustom: true,
        // We'll generate a style object or dynamic class for custom colors
      };
    });
    return merged;
  };

  return { customStatuses, isLoading, getMergedStatuses };
}
