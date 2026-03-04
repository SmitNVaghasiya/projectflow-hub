import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/hooks/useProjects";
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
    project: Project;
}

export function EditProjectDialog({ open, onOpenChange, project }: Props) {
    const { updateProject } = useProjects();
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || "");
    const [status, setStatus] = useState(project.status);
    const [priority, setPriority] = useState(project.priority);
    const [dueDate, setDueDate] = useState(project.due_date || "");
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

    useEffect(() => {
        if (open) {
            setName(project.name);
            setDescription(project.description || "");
            setStatus(project.status);
            setPriority(project.priority);
            setDueDate(project.due_date || "");
        }
    }, [open, project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateProject.mutateAsync({
            id: project.id,
            name: name.trim(),
            description: description.trim() || null,
            status,
            priority,
            due_date: dueDate || null,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Edit Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Project Name *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">🟢 Low</SelectItem>
                                    <SelectItem value="medium">🟡 Medium</SelectItem>
                                    <SelectItem value="high">🔴 High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={updateProject.isPending} className="gradient-primary">
                            {updateProject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
