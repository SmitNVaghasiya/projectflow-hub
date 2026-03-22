import { useState } from "react";
import { GripVertical, CheckSquare, Square, Pencil, Trash2, Plus, Calendar, ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type ApiTask, type ApiSubItem } from "@/lib/api";
import { priorityColors, priorityEmoji, statusColors, statusLabels } from "./utils";
import { SubItemRow, AddSubItemRow } from "./SubItemRow";

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

export function TaskCard({
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
                    {!isViewer && (
                        <GripVertical className="h-4 w-4 mt-1 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 cursor-grab" />
                    )}

                    {isViewer ? (
                        <div className="mt-0.5 shrink-0 text-muted-foreground">
                            {isDone ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                        </div>
                    ) : (
                        <button onClick={handleToggleDone} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                            {isDone ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5" />}
                        </button>
                    )}

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

export function InsertTrigger({ onInsert }: { onInsert: () => void }) {
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
