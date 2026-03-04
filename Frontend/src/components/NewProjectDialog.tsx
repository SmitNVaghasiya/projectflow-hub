import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewProjectDialog({ open, onOpenChange }: Props) {
    const { createProject } = useProjects();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [dueDate, setDueDate] = useState("");
    const [hideWarning, setHideWarning] = useState(false);

    useEffect(() => {
        const suppressedUntil = localStorage.getItem('hidePastDateWarning');
        if (suppressedUntil && parseInt(suppressedUntil, 10) > Date.now()) {
            setHideWarning(true);
        }
    }, []);

    const dismissWarning = () => {
        const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
        localStorage.setItem('hidePastDateWarning', thirtyDays.toString());
        setHideWarning(true);
    };

    const isPastDate = dueDate ? new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

    const currentYear = new Date().getFullYear();
    const minDate = `${currentYear - 100}-01-01`;
    const maxDate = `${currentYear + 100}-12-31`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await createProject.mutateAsync({
            name: name.trim(),
            description: description.trim() || undefined,
            status,
            priority,
            due_date: dueDate || null,
        });
        // Reset
        setName("");
        setDescription("");
        setStatus("todo");
        setPriority("medium");
        setDueDate("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="proj-name">Project Name *</Label>
                        <Input
                            id="proj-name"
                            placeholder="e.g. AI Review Dashboard"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="proj-desc">Description</Label>
                        <Textarea
                            id="proj-desc"
                            placeholder="What is this project about?"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">🟢 Low</SelectItem>
                                    <SelectItem value="medium">🟡 Medium</SelectItem>
                                    <SelectItem value="high">🔴 High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="proj-due">Due Date</Label>
                        <Input
                            id="proj-due"
                            type="date"
                            min={minDate}
                            max={maxDate}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                        {isPastDate && !hideWarning && (
                            <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-500/10 p-2 rounded flex flex-col gap-1 border border-amber-500/20">
                                <span>Warning: The selected date is in the past.</span>
                                <button type="button" onClick={dismissWarning} className="text-left hover:underline opacity-80">
                                    Don't show this again for 30 days
                                </button>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createProject.isPending} className="gradient-primary">
                            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
