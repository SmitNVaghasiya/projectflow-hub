import { useState } from "react";
import { Calendar, CheckSquare, Square, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiCreateSubItem, type ApiSubItem } from "@/lib/api";
import { priorityColors, priorityEmoji } from "./utils";

interface SubItemRowProps {
    sub: ApiSubItem;
    isViewer: boolean;
    onUpdate: (id: string, updates: Partial<ApiSubItem>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function SubItemRow({ sub, isViewer, onUpdate, onDelete }: SubItemRowProps) {
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

export function AddSubItemRow({ taskId, onSave }: { taskId: string; onSave: (sub: ApiSubItem) => void }) {
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
