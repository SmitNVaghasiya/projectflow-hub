import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import type { Project, ProjectStatus } from "@/hooks/useProjects";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { apiGetTasks } from "@/lib/api";

// ─── Column config ────────────────────────────────────────────────────────────
const columns: { id: ProjectStatus; title: string; color: string; textClass: string; dropActive: string; dropIdle: string }[] = [
  {
    id: "todo",
    title: "Planned",
    color: "#6B7280",
    textClass: "text-gray-500 dark:text-gray-400",
    dropActive: "border-gray-400/60 bg-gray-100/60 dark:bg-gray-800/30",
    dropIdle: "border-gray-200 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-900/10",
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "#F59E0B",
    textClass: "text-amber-600 dark:text-amber-400",
    dropActive: "border-amber-400/60 bg-amber-50/60 dark:bg-amber-900/20",
    dropIdle: "border-amber-200/70 dark:border-amber-800/40 bg-amber-50/20 dark:bg-amber-900/5",
  },
  {
    id: "done",
    title: "Done",
    color: "#10B981",
    textClass: "text-emerald-600 dark:text-emerald-400",
    dropActive: "border-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-900/20",
    dropIdle: "border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-900/5",
  },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};
const priorityEmoji: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };

// ─── Kanban Card ──────────────────────────────────────────────────────────────
interface KanbanCardProps {
  project: Project;
  index: number;
}

function KanbanProjectCard({ project, index }: KanbanCardProps) {
  const navigate = useNavigate();
  const [taskCount, setTaskCount] = useState<{ total: number; done: number } | null>(null);
  const isOverdue = project.due_date && project.status !== "done" && new Date(project.due_date) < new Date();

  useEffect(() => {
    apiGetTasks(project.id).then(({ data }) => {
      if (data) setTaskCount({ total: data.length, done: data.filter(t => t.status === "done").length });
    });
  }, [project.id]);

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}   // whole card is the drag handle
          onClick={() => navigate(`/projects/${project.id}`)}
          className={[
            "rounded-xl border bg-card shadow-sm select-none",
            "cursor-pointer transition-all duration-150",
            snapshot.isDragging
              ? "shadow-xl scale-[1.03] rotate-[1deg] border-primary/40 ring-2 ring-primary/20 z-50"
              : "hover:shadow-md hover:border-primary/30 border-border hover:-translate-y-0.5",
          ].join(" ")}
        >
          <div className="p-4 space-y-2.5">
            {/* Title */}
            <p className="font-semibold text-sm leading-snug line-clamp-2">{project.name}</p>

            {project.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{project.description}</p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColors[project.priority]}`}>
                {priorityEmoji[project.priority]} {project.priority}
              </span>

              {project.due_date && (
                <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  <Calendar className="h-2.5 w-2.5" />
                  {format(new Date(project.due_date), "MMM d")}
                  {isOverdue && " ⚠"}
                </span>
              )}

              {taskCount !== null && taskCount.total > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {taskCount.done}/{taskCount.total} tasks
                </span>
              )}
            </div>

            {/* Progress bar */}
            {taskCount !== null && taskCount.total > 0 && (
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(taskCount.done / taskCount.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Board Page ───────────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const { projects, isLoading, updateProject } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  // Optimistic status map: projectId -> status
  const [optimistic, setOptimistic] = useState<Record<string, ProjectStatus>>({});

  const getStatus = (p: Project): ProjectStatus =>
    (optimistic[p.id] ?? p.status) as ProjectStatus;

  const getColumnProjects = (status: ProjectStatus) =>
    projects.filter((p) => getStatus(p) === status);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as ProjectStatus;
    const project = projects.find((p) => p.id === draggableId);
    if (!project || getStatus(project) === newStatus) return;

    // Instant optimistic update — card snaps to new column immediately
    setOptimistic(prev => ({ ...prev, [draggableId]: newStatus }));

    // Background DB sync — revert only on failure
    updateProject.mutateAsync({ id: draggableId, status: newStatus }).catch(() => {
      setOptimistic(prev => {
        const next = { ...prev };
        delete next[draggableId];
        return next;
      });
    });
  };

  const totalDone = projects.filter(p => getStatus(p) === "done").length;
  const total = projects.length;
  const progressPct = total > 0 ? Math.round((totalDone / total) * 100) : 0;

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-muted-foreground mt-1">
            Drag cards between columns to update status
            {!isLoading && total > 0 && (
              <span className="ml-2 text-xs font-medium text-muted-foreground/70">
                · {progressPct}% complete ({totalDone}/{total})
              </span>
            )}
          </p>
        </div>
        <Button className="gradient-primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible" style={{ minHeight: "calc(100vh - 200px)" }}>
          {columns.map((col) => {
            const colProjects = getColumnProjects(col.id);
            return (
              <div key={col.id} className="flex flex-col min-w-[300px] md:min-w-0 snap-start">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <h2 className={`font-semibold text-sm ${col.textClass}`}>{col.title}</h2>
                  <Badge
                    variant="secondary"
                    className="text-xs ml-auto h-5 min-w-5 flex items-center justify-center rounded-full"
                  >
                    {isLoading ? "—" : colProjects.length}
                  </Badge>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={[
                        "flex-1 rounded-xl border border-dashed p-3 space-y-3 min-h-[200px] transition-all duration-200",
                        snapshot.isDraggingOver ? col.dropActive : col.dropIdle,
                      ].join(" ")}
                    >
                      {isLoading ? (
                        [...Array(2)].map((_, i) => (
                          <Skeleton key={i} className="h-24 rounded-xl" />
                        ))
                      ) : colProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-2">
                          <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                          <p className="text-xs text-muted-foreground/50">Drop a project here</p>
                        </div>
                      ) : (
                        colProjects.map((project, index) => (
                          <KanbanProjectCard
                            key={project.id}
                            project={project}
                            index={index}
                          />
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

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
