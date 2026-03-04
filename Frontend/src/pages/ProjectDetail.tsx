import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
    ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight,
    Calendar, Clock, Flag, Copy, Check, Pencil, MoreHorizontal,
    ListPlus, Layers, GripVertical, CheckSquare, Square,
    MessageSquare, Users, UserPlus, X, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import {
    apiGetProjects, apiGetTasks, apiCreateTask, apiUpdateTask, apiDeleteTask,
    apiCreateSubItem, apiUpdateSubItem, apiDeleteSubItem,
    apiGetProjectMembers, apiInviteMember, apiRemoveMember,
    apiGetComments, apiCreateComment, apiDeleteComment,
    apiGetSharedProjects,
    type ApiTask, type ApiSubItem, type ApiProject, type ApiMember, type ApiComment,
} from "@/lib/api";


// ─── Constants ───────────────────────────────────────────────────────────────
const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
};
const priorityEmoji: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
const statusColors: Record<string, string> = {
    todo: "bg-secondary text-secondary-foreground",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};
const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

// ─── TaskSortKey ─────────────────────────────────────────────────────────────
function sortTasks(tasks: ApiTask[]) {
    const priorityWeight = { high: 0, medium: 1, low: 2 };
    const active = tasks.filter((t) => t.status !== "done").sort((a, b) => {
        const pw = priorityWeight[a.priority] - priorityWeight[b.priority];
        if (pw !== 0) return pw;
        return a.sort_order - b.sort_order;
    });
    const done = tasks.filter((t) => t.status === "done");
    return { active, done };
}

// ─── Inline Add Task Form ─────────────────────────────────────────────────────
interface AddTaskFormProps {
    projectId: string;
    insertAtOrder: number;
    onSave: (task: ApiTask) => void;
    onCancel: () => void;
}

function AddTaskForm({ projectId, insertAtOrder, onSave, onCancel }: AddTaskFormProps) {
    const [content, setContent] = useState("");
    const [taskType, setTaskType] = useState<"simple" | "complex">("simple");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [showDate, setShowDate] = useState(false);
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [saving, setSaving] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();

    useEffect(() => { textRef.current?.focus(); }, []);

    const handleSave = async () => {
        if (!content.trim()) return;
        setSaving(true);
        const { data, error } = await apiCreateTask(projectId, {
            content: content.trim(),
            task_type: taskType,
            priority,
            due_date: dueDate || null,
            due_time: dueTime || null,
            sort_order: insertAtOrder,
        });
        setSaving(false);
        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
        onSave(data!);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    };

    return (
        <div className="rounded-xl border border-primary/40 bg-card shadow-md p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Type toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setTaskType("simple")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${taskType === "simple"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                >
                    <ListPlus className="h-3.5 w-3.5" /> Simple
                </button>
                <button
                    onClick={() => setTaskType("complex")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${taskType === "complex"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                >
                    <Layers className="h-3.5 w-3.5" /> + Sub-items
                </button>
            </div>

            {/* Content */}
            <Textarea
                ref={textRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Write your task, plan, or idea here... (Ctrl+Enter to save)"
                className="min-h-[80px] resize-none text-sm border-border focus-visible:ring-1"
                rows={3}
            />

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Priority */}
                <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 text-xs px-2.5">
                        <span>{priorityEmoji[priority]}</span>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                </Select>

                {/* Date toggle */}
                {!showDate ? (
                    <button
                        type="button"
                        onClick={() => setShowDate(true)}
                        className="h-8 flex items-center gap-1.5 px-2.5 rounded-md text-xs text-muted-foreground border border-border hover:border-primary/40 transition-colors"
                    >
                        <Calendar className="h-3.5 w-3.5" /> Add date & time
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                            type="time"
                            value={dueTime}
                            onChange={(e) => setDueTime(e.target.value)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                            type="button"
                            onClick={() => { setShowDate(false); setDueDate(""); setDueTime(""); }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >✕</button>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" className="gradient-primary" onClick={handleSave} disabled={saving || !content.trim()}>
                    {saving ? "Saving…" : "Save task"}
                </Button>
            </div>
        </div>
    );
}

// ─── Sub-item Row ─────────────────────────────────────────────────────────────
interface SubItemRowProps {
    sub: ApiSubItem;
    isViewer: boolean;
    onUpdate: (id: string, updates: Partial<ApiSubItem>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

function SubItemRow({ sub, isViewer, onUpdate, onDelete }: SubItemRowProps) {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(sub.content);
    const [showDate, setShowDate] = useState(!!(sub.due_date));
    const [dueDate, setDueDate] = useState(sub.due_date || "");
    const [dueTime, setDueTime] = useState(sub.due_time || "");
    const [priority, setPriority] = useState(sub.priority);

    const handleToggle = () => onUpdate(sub.id, { is_done: !sub.is_done });
    const handleSaveEdit = async () => {
        await onUpdate(sub.id, { content, priority: priority as "low" | "medium" | "high", due_date: dueDate || null, due_time: dueTime || null });
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="ml-6 space-y-2 p-2 rounded-lg border border-border bg-muted/20 animate-in fade-in duration-150">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[60px] resize-none text-xs"
                    rows={2}
                    autoFocus
                />
                <div className="flex flex-wrap gap-2 items-center">
                    <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                        <SelectTrigger className="h-7 w-auto text-xs px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="high">🔴 High</SelectItem>
                            <SelectItem value="medium">🟡 Med</SelectItem>
                            <SelectItem value="low">🟢 Low</SelectItem>
                        </SelectContent>
                    </Select>
                    {!showDate ? (
                        <button onClick={() => setShowDate(true)} className="h-7 flex items-center gap-1 px-2 rounded border border-border text-xs text-muted-foreground hover:border-primary/40">
                            <Calendar className="h-3 w-3" /> Add date
                        </button>
                    ) : (
                        <>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                                className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
                            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                                className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
                        </>
                    )}
                    <div className="flex gap-1 ml-auto">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditing(false)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs px-3 gradient-primary" onClick={handleSaveEdit}>Save</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group ml-6 flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
            {isViewer ? (
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                    {sub.is_done ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                </div>
            ) : (
                <button onClick={handleToggle} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                    {sub.is_done ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                </button>
            )}
            <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${sub.is_done ? "line-through text-muted-foreground" : ""}`}>
                    {sub.content}
                </p>
                <div className="flex flex-wrap gap-2 mt-1 items-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[sub.priority]}`}>
                        {priorityEmoji[sub.priority]} {sub.priority}
                    </span>
                    {sub.due_date && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {sub.due_date}{sub.due_time && ` · ${sub.due_time}`}
                        </span>
                    )}
                </div>
            </div>
            {!isViewer && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                    <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onDelete(sub.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Add Sub-item inline ──────────────────────────────────────────────────────
function AddSubItemRow({ taskId, onSave }: { taskId: string; onSave: (sub: ApiSubItem) => void }) {
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState("medium");
    const [showDate, setShowDate] = useState(false);
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!content.trim()) return;
        setSaving(true);
        const { data, error } = await apiCreateSubItem(taskId, {
            content: content.trim(), priority, due_date: dueDate || null, due_time: dueTime || null,
        });
        setSaving(false);
        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
        onSave(data!);
        setContent(""); setDueDate(""); setDueTime(""); setShowDate(false);
    };

    return (
        <div className="ml-6 mt-1.5 space-y-2">
            <div className="flex gap-2">
                <Input
                    placeholder="Add a sub-item…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                    className="h-8 text-xs"
                />
                <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-8 w-20 text-xs px-2">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="high">🔴</SelectItem>
                        <SelectItem value="medium">🟡</SelectItem>
                        <SelectItem value="low">🟢</SelectItem>
                    </SelectContent>
                </Select>
                {!showDate ? (
                    <button onClick={() => setShowDate(true)} className="h-8 flex items-center gap-1 px-2 rounded border border-border text-xs text-muted-foreground hover:border-primary/40 shrink-0">
                        <Calendar className="h-3.5 w-3.5" />
                    </button>
                ) : (
                    <>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                            className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
                        <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                            className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
                    </>
                )}
                <Button size="sm" className="h-8 gradient-primary" onClick={handleSave} disabled={saving || !content.trim()}>
                    Add
                </Button>
            </div>
        </div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
interface TaskCardProps {
    task: ApiTask;
    isViewer: boolean;
    onUpdate: (id: string, updates: Partial<ApiTask>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAddSubItem: (taskId: string, sub: ApiSubItem) => void;
    onUpdateSubItem: (taskId: string, subId: string, updates: Partial<ApiSubItem>) => Promise<void>;
    onDeleteSubItem: (taskId: string, subId: string) => Promise<void>;
    onInsertAfter: (sortOrder: number) => void;
}

function TaskCard({
    task, isViewer, onUpdate, onDelete, onAddSubItem,
    onUpdateSubItem, onDeleteSubItem, onInsertAfter,
}: TaskCardProps) {
    const [expanded, setExpanded] = useState(true);
    const [addingSub, setAddingSub] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(task.content);
    const [editPriority, setEditPriority] = useState(task.priority);
    const [editStatus, setEditStatus] = useState(task.status);
    const [showDate, setShowDate] = useState(!!(task.due_date));
    const [editDueDate, setEditDueDate] = useState(task.due_date || "");
    const [editDueTime, setEditDueTime] = useState(task.due_time || "");
    const isDone = task.status === "done";

    const handleToggleDone = () => onUpdate(task.id, { status: isDone ? "todo" : "done" });
    const handleSaveEdit = async () => {
        await onUpdate(task.id, {
            content: editContent, priority: editPriority as "low" | "medium" | "high",
            status: editStatus as "todo" | "in_progress" | "done",
            due_date: editDueDate || null, due_time: editDueTime || null,
        });
        setEditing(false);
    };

    // Render content with bullet lines
    const renderContent = (text: string) => {
        const lines = text.split("\n");
        return lines.map((line, i) => {
            const isBullet = line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
            const bulletText = isBullet ? line.replace(/^[\s]*[-•]\s/, "") : line;
            return (
                <span key={i} className={`block ${isBullet ? "pl-3 before:content-['•'] before:mr-2 before:text-primary" : ""}`}>
                    {bulletText}
                </span>
            );
        });
    };

    return (
        <div className={`group relative rounded-xl border bg-card transition-all hover:shadow-sm ${isDone ? "opacity-60 border-border" : "border-border hover:border-primary/30"}`}>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Drag handle */}
                    {!isViewer && (
                        <GripVertical className="h-4 w-4 mt-1 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 cursor-grab" />
                    )}

                    {/* Checkbox */}
                    {isViewer ? (
                        <div className="mt-0.5 shrink-0 text-muted-foreground">
                            {isDone ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                        </div>
                    ) : (
                        <button onClick={handleToggleDone} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                            {isDone ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                        </button>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {editing ? (
                            <div className="space-y-2">
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[80px] resize-none text-sm"
                                    autoFocus
                                    rows={3}
                                />
                                <div className="flex flex-wrap gap-2 items-center">
                                    <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "low" | "medium" | "high")}>
                                        <SelectTrigger className="h-8 w-auto text-xs px-2.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high">🔴 High</SelectItem>
                                            <SelectItem value="medium">🟡 Medium</SelectItem>
                                            <SelectItem value="low">🟢 Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "todo" | "in_progress" | "done")}>
                                        <SelectTrigger className="h-8 w-auto text-xs px-2.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todo">To Do</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="done">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {!showDate ? (
                                        <button onClick={() => setShowDate(true)} className="h-8 flex items-center gap-1.5 px-2.5 rounded-md text-xs text-muted-foreground border border-border hover:border-primary/40">
                                            <Calendar className="h-3.5 w-3.5" /> Add date & time
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                                                className="h-8 rounded border border-border bg-background px-2 text-xs focus:outline-none" />
                                            <input type="time" value={editDueTime} onChange={(e) => setEditDueTime(e.target.value)}
                                                className="h-8 rounded border border-border bg-background px-2 text-xs focus:outline-none" />
                                            <button onClick={() => { setShowDate(false); setEditDueDate(""); setEditDueTime(""); }}
                                                className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                                        </div>
                                    )}
                                    <div className="flex gap-2 ml-auto">
                                        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                                        <Button size="sm" className="gradient-primary" onClick={handleSaveEdit}>Save</Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className={`text-sm leading-relaxed ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                    {renderContent(task.content)}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                                        {priorityEmoji[task.priority]} {task.priority}
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs ${statusColors[task.status]}`}>
                                        {statusLabels[task.status]}
                                    </Badge>
                                    {task.due_date && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {task.due_date}{task.due_time && ` · ${task.due_time}`}
                                        </span>
                                    )}
                                    {task.task_type === "complex" && (
                                        <button
                                            onClick={() => setExpanded(!expanded)}
                                            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                            {task.sub_items.length} sub-item{task.sub_items.length !== 1 ? "s" : ""}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    {!editing && !isViewer && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => onInsertAfter(task.sort_order + 1)}
                                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Insert task below"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditing(true)}>
                                        <Pencil className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    {task.task_type === "complex" && (
                                        <DropdownMenuItem onClick={() => { setExpanded(true); setAddingSub(true); }}>
                                            <Plus className="h-4 w-4 mr-2" /> Add sub-item
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(task.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-items (complex tasks) */}
            {task.task_type === "complex" && expanded && (
                <div className="px-4 pb-4 space-y-1 border-t border-border/50 pt-3 mt-1">
                    {task.sub_items.map((sub) => (
                        <SubItemRow
                            key={sub.id}
                            sub={sub}
                            isViewer={isViewer}
                            onUpdate={async (id, updates) => { await onUpdateSubItem(task.id, id, updates); }}
                            onDelete={async (id) => { await onDeleteSubItem(task.id, id); }}
                        />
                    ))}
                    {!isViewer && (
                        addingSub ? (
                            <AddSubItemRow
                                taskId={task.id}
                                onSave={(sub) => { onAddSubItem(task.id, sub); setAddingSub(false); }}
                            />
                        ) : (
                            <button
                                onClick={() => setAddingSub(true)}
                                className="ml-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add sub-item
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Insert Between Trigger ───────────────────────────────────────────────────
function InsertTrigger({ onInsert }: { onInsert: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="flex items-center gap-2 py-1 group cursor-pointer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onInsert}
        >
            <div className={`flex-1 h-px transition-colors ${hovered ? "bg-primary/40" : "bg-transparent"}`} />
            {hovered && (
                <div className="flex items-center gap-1 text-xs text-primary animate-in fade-in duration-100">
                    <Plus className="h-3.5 w-3.5" /> Insert task here
                </div>
            )}
            <div className={`flex-1 h-px transition-colors ${hovered ? "bg-primary/40" : "bg-transparent"}`} />
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [project, setProject] = useState<ApiProject | null>(null);
    const [tasks, setTasks] = useState<ApiTask[]>([]);
    const [loadingProject, setLoadingProject] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [addingAt, setAddingAt] = useState<number | null>(null); // sort_order for insertion
    const [showCompleted, setShowCompleted] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [members, setMembers] = useState<ApiMember[]>([]);
    const [comments, setComments] = useState<ApiComment[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
    const [commentText, setCommentText] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    // Load project — check own projects first, then shared
    useEffect(() => {
        if (!id) return;
        (async () => {
            const { data } = await apiGetProjects();
            if (data) {
                const proj = data.find((p) => p.id === id);
                if (proj) { setProject(proj as unknown as ApiProject); setLoadingProject(false); return; }
            }
            // Fallback: check shared/collaborative projects
            const { data: shared } = await apiGetSharedProjects();
            if (shared) {
                const sproj = shared.find((p) => p.id === id);
                if (sproj) { setProject(sproj as unknown as ApiProject); setLoadingProject(false); return; }
            }
            navigate("/");
            setLoadingProject(false);
        })();
    }, [id]);


    // Load tasks
    useEffect(() => {
        if (!id) return;
        (async () => {
            const { data, error } = await apiGetTasks(id);
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
        // Optimistic update
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
        const { data, error } = await apiUpdateTask(taskId, updates);
        if (error) {
            toast({ title: "Error", description: error, variant: "destructive" });
            if (id) apiGetTasks(id).then(res => { if (res.data) setTasks(res.data); }); // revert on error
            return;
        }
        if (data) setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...data } : t)));
    }, [id, toast]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        const { error } = await apiDeleteTask(taskId);
        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast({ title: "Task deleted" });
    }, []);

    const handleAddSubItem = useCallback((taskId: string, sub: ApiSubItem) => {
        setTasks((prev) => prev.map((t) =>
            t.id === taskId ? { ...t, sub_items: [...t.sub_items, sub] } : t
        ));
    }, []);

    const handleUpdateSubItem = useCallback(async (taskId: string, subId: string, updates: Partial<ApiSubItem>) => {
        // Optimistic update
        setTasks((prev) => prev.map((t) =>
            t.id === taskId
                ? { ...t, sub_items: t.sub_items.map((s) => (s.id === subId ? { ...s, ...updates } : s)) }
                : t
        ));
        const { data, error } = await apiUpdateSubItem(subId, updates);
        if (error) {
            toast({ title: "Error", description: error, variant: "destructive" });
            if (id) apiGetTasks(id).then(res => { if (res.data) setTasks(res.data); }); // revert on error
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
    }, []);

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

    // Check if user is a viewer
    const isViewer = (project as any).member_role === "viewer";
    // Check if user is owner
    const isOwner = !(project as any).member_role;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            {/* ── Back ── */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {/* ── Project Header ── */}
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

            {/* ── Tasks Section ── */}
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
                        {/* Add at top */}
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
                                {/* Insert Trigger Area below each active task */}
                                {i < activeTasks.length - 1 && !isViewer && addingAt !== activeTasks[i + 1].sort_order && (
                                    <InsertTrigger onInsert={() => setAddingAt(activeTasks[i + 1].sort_order)} />
                                )}
                                {i === activeTasks.length - 1 && !isViewer && addingAt !== tasks.length && (
                                    <InsertTrigger onInsert={() => setAddingAt(tasks.length)} />
                                )}
                            </div>
                        ))}

                        {/* Add at bottom */}
                        {addingAt !== null && addingAt >= activeTasks.length && id && addingAt !== 0 && (
                            <AddTaskForm
                                projectId={id}
                                insertAtOrder={addingAt}
                                onSave={handleTaskSave}
                                onCancel={() => setAddingAt(null)}
                            />
                        )}

                        {/* Completed section */}
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

            {/* ── Share Panel ── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                    onClick={() => {
                        if (!showShare) {
                            apiGetProjectMembers(project.id).then(({ data }) => {
                                if (data) setMembers(data.members);
                            });
                        }
                        setShowShare(!showShare);
                    }}
                    className="w-full flex items-center gap-2 px-6 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Share & Collaborators
                    {showShare ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
                {showShare && (
                    <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
                        {/* Invite */}
                        {isOwner && (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Email address…"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="flex-1 text-sm"
                                />
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}>
                                    <SelectTrigger className="w-28 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    className="gradient-primary shrink-0"
                                    onClick={async () => {
                                        if (!inviteEmail.trim()) return;
                                        const { error } = await apiInviteMember(project.id, inviteEmail.trim(), inviteRole);
                                        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
                                        toast({ title: "Invited!", description: `${inviteEmail} has been invited as ${inviteRole}.` });
                                        setInviteEmail("");
                                        const { data } = await apiGetProjectMembers(project.id);
                                        if (data) setMembers(data.members);
                                    }}
                                >
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        {/* Members list */}
                        {members.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No collaborators yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border bg-muted/10">
                                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {m.display_name?.slice(0, 2).toUpperCase() || m.email.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{m.display_name || m.email}</p>
                                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground capitalize border border-border rounded px-1.5 py-0.5">{m.role}</span>
                                        {isOwner && (
                                            <button
                                                onClick={async () => {
                                                    await apiRemoveMember(project.id, m.id);
                                                    setMembers(prev => prev.filter(x => x.id !== m.id));
                                                    toast({ title: "Member removed" });
                                                }}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Comments Panel ── */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <button
                    onClick={() => {
                        if (!showComments) {
                            apiGetComments(project.id).then(({ data }) => {
                                if (data) setComments(data);
                            });
                        }
                        setShowComments(!showComments);
                    }}
                    className="w-full flex items-center gap-2 px-6 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Comments
                    {comments.length > 0 && <span className="text-xs text-muted-foreground ml-1">({comments.length})</span>}
                    {showComments ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
                {showComments && (
                    <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
                        {/* Comment list */}
                        <div className="space-y-3">
                            {comments.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No comments yet. Be the first!</p>
                            )}
                            {comments.map((c) => (
                                <div key={c.id} className="group flex gap-3">
                                    <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                                        {(c.display_name || c.email).slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-semibold">{c.display_name || c.email}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {format(new Date(c.created_at), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed mt-0.5">{c.content}</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await apiDeleteComment(c.id);
                                            setComments(prev => prev.filter(x => x.id !== c.id));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive self-start mt-1"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {/* New comment */}
                        {!isViewer && (
                            <div className="flex gap-2">
                                <Textarea
                                    placeholder="Write a comment…"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                            if (!commentText.trim()) return;
                                            setPostingComment(true);
                                            const { data, error } = await apiCreateComment(project.id, commentText.trim());
                                            setPostingComment(false);
                                            if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
                                            if (data) setComments(prev => [...prev, data]);
                                            setCommentText("");
                                        }
                                    }}
                                    className="flex-1 min-h-[60px] resize-none text-sm"
                                    rows={2}
                                />
                                <Button
                                    size="sm"
                                    className="gradient-primary self-end shrink-0"
                                    disabled={postingComment || !commentText.trim()}
                                    onClick={async () => {
                                        if (!commentText.trim()) return;
                                        setPostingComment(true);
                                        const { data, error } = await apiCreateComment(project.id, commentText.trim());
                                        setPostingComment(false);
                                        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
                                        if (data) setComments(prev => [...prev, data]);
                                        setCommentText("");
                                    }}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Dialogs */}
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

