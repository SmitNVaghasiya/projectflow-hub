import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Calendar, Copy, Check, Pencil, MoreHorizontal, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import {
    apiGetProjects, apiGetTasks, apiUpdateTask, apiDeleteTask,
    apiUpdateSubItem, apiDeleteSubItem,
    apiGetSharedProjects,
    type ApiTask, type ApiSubItem, type ApiProject
} from "@/lib/api";

import { statusColors, statusLabels, priorityColors, priorityEmoji, sortTasks } from "@/components/ProjectDetail/utils";
import { AddTaskForm } from "@/components/ProjectDetail/AddTaskForm";
import { TaskCard, InsertTrigger } from "@/components/ProjectDetail/TaskCard";
import { SharePanel } from "@/components/ProjectDetail/SharePanel";
import { CommentSection } from "@/components/ProjectDetail/CommentSection";

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [project, setProject] = useState<ApiProject | null>(null);
    const [tasks, setTasks] = useState<ApiTask[]>([]);
    const [loadingProject, setLoadingProject] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [addingAt, setAddingAt] = useState<number | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const { data } = await apiGetProjects();
            if (data) {
                const proj = data.find((p) => p.id === id);
                if (proj) { setProject(proj as unknown as ApiProject); setLoadingProject(false); return; }
            }
            const { data: shared } = await apiGetSharedProjects();
            if (shared) {
                const sproj = shared.find((p) => p.id === id);
                if (sproj) { setProject(sproj as unknown as ApiProject); setLoadingProject(false); return; }
            }
            navigate("/");
            setLoadingProject(false);
        })();
    }, [id, navigate]);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const { data } = await apiGetTasks(id);
            if (data) setTasks(data);
            setLoadingTasks(false);
        })();
    }, [id]);

    const handleTaskSave = useCallback((task: ApiTask) => {
        setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === task.id);
            if (idx >= 0) { const updated = [...prev]; updated[idx] = task; return updated; }
            return [...prev, task].sort((a, b) => a.sort_order - b.sort_order);
        });
        setAddingAt(null);
    }, []);

    const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<ApiTask>) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
        const { data, error } = await apiUpdateTask(taskId, updates);
        if (error) {
            toast({ title: "Error", description: error, variant: "destructive" });
            if (id) apiGetTasks(id).then(res => { if (res.data) setTasks(res.data); });
            return;
        }
        if (data) setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...data } : t)));
    }, [id, toast]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        const { error } = await apiDeleteTask(taskId);
        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast({ title: "Task deleted" });
    }, [toast]);

    const handleAddSubItem = useCallback((taskId: string, sub: ApiSubItem) => {
        setTasks((prev) => prev.map((t) =>
            t.id === taskId ? { ...t, sub_items: [...t.sub_items, sub] } : t
        ));
    }, []);

    const handleUpdateSubItem = useCallback(async (taskId: string, subId: string, updates: Partial<ApiSubItem>) => {
        setTasks((prev) => prev.map((t) =>
            t.id === taskId
                ? { ...t, sub_items: t.sub_items.map((s) => (s.id === subId ? { ...s, ...updates } : s)) }
                : t
        ));
        const { data, error } = await apiUpdateSubItem(subId, updates);
        if (error) {
            toast({ title: "Error", description: error, variant: "destructive" });
            if (id) apiGetTasks(id).then(res => { if (res.data) setTasks(res.data); });
            return;
        }
        if (data) {
            setTasks((prev) => prev.map((t) =>
                t.id === taskId
                    ? { ...t, sub_items: t.sub_items.map((s) => (s.id === subId ? { ...s, ...data } : s)) }
                    : t
            ));
        }
    }, [id, toast]);

    const handleDeleteSubItem = useCallback(async (taskId: string, subId: string) => {
        const { error } = await apiDeleteSubItem(subId);
        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
        setTasks((prev) => prev.map((t) =>
            t.id === taskId ? { ...t, sub_items: t.sub_items.filter((s) => s.id !== subId) } : t
        ));
    }, [toast]);

    const handleCopyJSON = () => {
        if (!project) return;
        const payload = {
            project: {
                name: project.name, description: project.description,
                status: project.status, priority: project.priority, due_date: project.due_date,
            },
            tasks: tasks.map((t) => ({
                content: t.content, task_type: t.task_type,
                status: t.status, priority: t.priority,
                due_date: t.due_date, due_time: t.due_time,
                sub_items: t.sub_items.map((s) => ({
                    content: s.content, priority: s.priority,
                    due_date: s.due_date, due_time: s.due_time, is_done: s.is_done,
                })),
            })),
        };
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Project details copied as JSON." });
    };

    const handleCopyText = () => {
        if (!project) return;
        const lines = [
            `# ${project.name}`,
            project.description ? `\n${project.description}` : "",
            `\nStatus: ${statusLabels[project.status]} | Priority: ${project.priority} | Due: ${project.due_date || "—"}`,
            "\n## Tasks",
            ...tasks.map((t, i) => {
                const subs = t.sub_items.map((s) => `   - [${s.is_done ? "x" : " "}] ${s.content}`).join("\n");
                return `${i + 1}. [${t.status === "done" ? "x" : " "}] ${t.content}${subs ? "\n" + subs : ""}`;
            }),
        ].join("\n");
        navigator.clipboard.writeText(lines);
        toast({ title: "Copied!", description: "Project details copied as text." });
    };

    const { active: activeTasks, done: doneTasks } = sortTasks(tasks);

    if (loadingProject) {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (!project) return null;

    const isOverdue = project.due_date && project.status !== "done" && new Date(project.due_date) < new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectAny = project as any;
    const isViewer = projectAny.member_role === "viewer";
    const isOwner = !projectAny.member_role;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight break-words">{project.name}</h1>
                        {project.description && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{project.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!isViewer && (
                            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                                <Pencil className="h-4 w-4 mr-1.5" /> Edit
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleCopyJSON}>
                                    {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                                    Copy as JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleCopyText}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy as text
                                </DropdownMenuItem>
                                {isOwner && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete project
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Badge variant="outline" className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                    </Badge>
                    <Badge variant="outline" className={priorityColors[project.priority]}>
                        {priorityEmoji[project.priority]} {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                    </Badge>
                    {project.due_date && (
                        <span className={`flex items-center gap-1.5 text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                            <Calendar className="h-4 w-4" />
                            {format(new Date(project.due_date), "MMM d, yyyy")}
                            {isOverdue && <span className="text-xs font-medium">(overdue)</span>}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                        {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {doneTasks.length} done
                    </span>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold">Tasks & Plans</h2>
                    {!isViewer && (
                        <Button
                            size="sm"
                            className="gradient-primary"
                            onClick={() => setAddingAt(tasks.length)}
                        >
                            <Plus className="h-4 w-4 mr-1.5" /> Add Task
                        </Button>
                    )}
                </div>

                {loadingTasks ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {addingAt === 0 && id && (
                            <AddTaskForm
                                projectId={id}
                                insertAtOrder={0}
                                onSave={handleTaskSave}
                                onCancel={() => setAddingAt(null)}
                            />
                        )}

                        {activeTasks.length === 0 && addingAt === null && (
                            <div className="flex flex-col items-center justify-center py-14 text-center gap-3 rounded-xl border border-dashed border-border">
                                <ListPlus className="h-10 w-10 text-muted-foreground/40" />
                                <p className="text-muted-foreground font-medium">No tasks yet</p>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Click "Add Task" to create your first task or plan for this project.
                                </p>
                            </div>
                        )}

                        {activeTasks.map((t, i) => (
                            <div key={t.id}>
                                {addingAt === t.sort_order && (
                                    <div className="mb-2">
                                        <AddTaskForm projectId={id!} insertAtOrder={t.sort_order} onSave={handleTaskSave} onCancel={() => setAddingAt(null)} />
                                    </div>
                                )}
                                <TaskCard
                                    task={t}
                                    isViewer={isViewer}
                                    onUpdate={handleUpdateTask}
                                    onDelete={handleDeleteTask}
                                    onAddSubItem={handleAddSubItem}
                                    onUpdateSubItem={handleUpdateSubItem}
                                    onDeleteSubItem={handleDeleteSubItem}
                                    onInsertAfter={setAddingAt}
                                />
                                {i < activeTasks.length - 1 && !isViewer && addingAt !== activeTasks[i + 1].sort_order && (
                                    <InsertTrigger onInsert={() => setAddingAt(activeTasks[i + 1].sort_order)} />
                                )}
                                {i === activeTasks.length - 1 && !isViewer && addingAt !== tasks.length && (
                                    <InsertTrigger onInsert={() => setAddingAt(tasks.length)} />
                                )}
                            </div>
                        ))}

                        {addingAt !== null && addingAt >= activeTasks.length && id && addingAt !== 0 && (
                            <AddTaskForm
                                projectId={id}
                                insertAtOrder={addingAt}
                                onSave={handleTaskSave}
                                onCancel={() => setAddingAt(null)}
                            />
                        )}

                        {doneTasks.length > 0 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                                >
                                    {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    Completed ({doneTasks.length})
                                </button>
                                {showCompleted && (
                                    <div className="space-y-2 mt-3 pt-2 border-t border-border/50 fade-in duration-300">
                                        {doneTasks.map(t => (
                                            <TaskCard
                                                key={t.id}
                                                task={t}
                                                isViewer={isViewer}
                                                onUpdate={handleUpdateTask}
                                                onDelete={handleDeleteTask}
                                                onAddSubItem={handleAddSubItem}
                                                onUpdateSubItem={handleUpdateSubItem}
                                                onDeleteSubItem={handleDeleteSubItem}
                                                onInsertAfter={setAddingAt}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <SharePanel project={project} isOwner={isOwner} />
            <CommentSection project={project} isViewer={isViewer} />

            <EditProjectDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                project={project}
            />
            <DeleteProjectDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open);
                    if (!open) navigate("/");
                }}
                projectId={project.id}
                projectName={project.name}
            />
        </div>
    );
}
