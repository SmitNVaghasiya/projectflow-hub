import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, Calendar, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/hooks/useProjects";
import { EditProjectDialog } from "./EditProjectDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";

const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
};

const priorityIcons: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
};

interface Props {
    project: Project;
}

export function ProjectCard({ project }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const isOverdue = project.due_date && project.status !== "done" && new Date(project.due_date) < new Date();

    return (
        <>
            <Card className="bg-card border-border hover:border-primary/40 transition-colors cursor-default group">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{project.name}</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${priorityColors[project.priority]}`}>
                            {priorityIcons[project.priority]} {project.priority}
                        </Badge>

                        {project.due_date && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(project.due_date), "MMM d")}
                                {isOverdue && " (overdue)"}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <EditProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
            <DeleteProjectDialog open={deleteOpen} onOpenChange={setDeleteOpen} projectId={project.id} projectName={project.name} />
        </>
    );
}
