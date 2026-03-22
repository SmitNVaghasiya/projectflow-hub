import { useState, useEffect, useRef } from "react";
import { ListPlus, Layers, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiCreateTask, type ApiTask } from "@/lib/api";
import { priorityEmoji } from "./utils";

interface AddTaskFormProps {
    projectId: string;
    insertAtOrder: number;
    onSave: (task: ApiTask) => void;
    onCancel: () => void;
}

export function AddTaskForm({ projectId, insertAtOrder, onSave, onCancel }: AddTaskFormProps) {
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

            <Textarea
                ref={textRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Write your task, plan, or idea here... (Ctrl+Enter to save)"
                className="min-h-[80px] resize-none text-sm border-border focus-visible:ring-1"
                rows={3}
            />

            <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" className="gradient-primary" onClick={handleSave} disabled={saving || !content.trim()}>
                    {saving ? "Saving…" : "Save task"}
                </Button>
            </div>
        </div>
    );
}
