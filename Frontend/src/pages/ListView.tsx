import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/hooks/useProjects";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";

// ── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; class: string }> = {
  todo: { label: "To Do", class: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  in_progress: { label: "In Progress", class: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400" },
  done: { label: "Completed", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  archived: { label: "Archived", class: "bg-muted text-muted-foreground" },
};

// ── Priority config ──────────────────────────────────────────────────────────
const priorityConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  high: { label: "High", dotClass: "bg-orange-500", textClass: "text-orange-600 dark:text-orange-400" },
  medium: { label: "Medium", dotClass: "bg-slate-400 dark:bg-slate-500", textClass: "text-slate-500 dark:text-slate-400" },
  low: { label: "Low", dotClass: "bg-blue-500", textClass: "text-blue-500  dark:text-blue-400" },
};

// ── Initials + color for project avatar ─────────────────────────────────────
const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-green-100  text-green-600  dark:bg-green-900/20  dark:text-green-400",
  "bg-red-100    text-red-600    dark:bg-red-900/20    dark:text-red-400",
  "bg-blue-100   text-blue-600   dark:bg-blue-900/20   dark:text-blue-400",
  "bg-amber-100  text-amber-600  dark:bg-amber-900/20  dark:text-amber-400",
  "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Pagination constants ──────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────

export default function ListView() {
  const { projects, isLoading } = useProjects();
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [page, setPage] = useState(1);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchPriority = filterPriority === "all" || p.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 whenever filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setFilterStatus(v); setPage(1); };
  const handlePriority = (v: string) => { setFilterPriority(v); setPage(1); };

  // ── Pagination page numbers ───────────────────────────────────────────────
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, "…", totalPages];
    if (safePage >= totalPages - 2) return [1, "…", totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", safePage - 1, safePage, safePage + 1, "…", totalPages];
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Project List</h1>
          <p className="text-muted-foreground mt-1">All projects in a sortable list</p>
        </div>
        <Button className="gradient-primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={handleStatus}>
          <SelectTrigger className="w-[130px] sm:w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={filterPriority} onValueChange={handlePriority}>
          <SelectTrigger className="w-[130px] sm:w-[150px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 border-b border-border">
                {/* Project Name — sortable icon (visual only, matching Stitch design) */}
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground">
                  <div className="flex items-center gap-1">
                    Project Name
                    <ArrowUp className="h-3.5 w-3.5" />
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground">
                  <div className="flex items-center gap-1">
                    Status
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground">
                  <div className="flex items-center gap-1">
                    Priority
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  Due Date
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell cursor-pointer hover:text-foreground text-right">
                  <div className="flex items-center justify-end gap-1">
                    Date Created
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </div>
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border">
              {isLoading ? (
                /* ── Loading skeletons ── */
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4" />
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                /* ── Empty state ── */
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    {projects.length === 0
                      ? "No projects yet. Create your first one!"
                      : "No projects match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((project) => {
                  const isOverdue =
                    project.due_date &&
                    project.status !== "done" &&
                    new Date(project.due_date) < new Date();

                  const s = statusConfig[project.status] || statusConfig.todo;
                  const pr = priorityConfig[project.priority] || priorityConfig.medium;
                  const initials = getInitials(project.name);
                  const avatarColor = getAvatarColor(project.name);

                  return (
                    <TableRow key={project.id} className="hover:bg-primary/5 transition-colors">
                      {/* ── Project name + initials avatar ── */}
                      <TableCell className="px-6 py-4">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          {/* Colored initials box */}
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium hover:text-primary transition-colors">
                              {project.name}
                            </p>
                            {project.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* ── Status pill ── */}
                      <TableCell className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${s.class}`}
                        >
                          {s.label}
                        </span>
                      </TableCell>

                      {/* ── Priority dot + label ── */}
                      <TableCell className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${pr.textClass}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${pr.dotClass}`} />
                          {pr.label}
                        </span>
                      </TableCell>

                      {/* ── Due date ── */}
                      <TableCell className="px-6 py-4 hidden lg:table-cell">
                        {project.due_date ? (
                          <span
                            className={`text-sm italic ${isOverdue ? "text-destructive" : "text-muted-foreground"
                              }`}
                          >
                            {format(new Date(project.due_date), "MMM d, yyyy")}
                            {isOverdue && (
                              <span className="ml-1 not-italic text-xs">(overdue)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      {/* ── Created date ── */}
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground italic text-right hidden md:table-cell">
                        {format(new Date(project.created_at), "MMM d, yyyy")}
                      </TableCell>

                      {/* ── Actions ── */}
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 rounded hover:text-primary transition-colors text-muted-foreground"
                            onClick={() => setEditProject(project)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:text-destructive transition-colors text-muted-foreground"
                            onClick={() => setDeleteProject(project)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination bar ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-white dark:bg-card/50 flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
              projects
            </p>

            <div className="flex items-center gap-1.5">
              {/* Previous */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {/* Page numbers */}
              {pageNumbers().map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${safePage === n
                        ? "gradient-primary text-white shadow-sm"
                        : "border border-border hover:bg-primary/5"
                      }`}
                  >
                    {n}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
      {editProject && (
        <EditProjectDialog
          open={!!editProject}
          onOpenChange={(o) => { if (!o) setEditProject(null); }}
          project={editProject}
        />
      )}
      {deleteProject && (
        <DeleteProjectDialog
          open={!!deleteProject}
          onOpenChange={(o) => { if (!o) setDeleteProject(null); }}
          projectId={deleteProject.id}
          projectName={deleteProject.name}
        />
      )}
    </div>
  );
}