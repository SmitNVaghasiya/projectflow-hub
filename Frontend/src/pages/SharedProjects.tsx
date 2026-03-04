import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Users, Search, FolderOpen, Calendar, ArrowUpRight } from "lucide-react";
import { apiGetSharedProjects, type ApiSharedProject } from "@/lib/api";

const statusLabels: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
};
const statusColors: Record<string, string> = {
    todo: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};
const priorityEmoji: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
const roleColors: Record<string, string> = {
    editor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    viewer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function SharedProjects() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<ApiSharedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");

    useEffect(() => {
        apiGetSharedProjects().then(({ data }) => {
            if (data) setProjects(data);
            setLoading(false);
        });
    }, []);

    const filtered = projects.filter((p) => {
        const matchSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase()) ||
            p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
            p.owner_email?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || p.status === statusFilter;
        const matchRole = roleFilter === "all" || p.member_role === roleFilter;
        return matchSearch && matchStatus && matchRole;
    });

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-7 w-7 text-primary" />
                        Collaborations
                    </h1>
                    <p className="text-muted-foreground mt-1">Projects shared with you by other users</p>
                </div>
                {!loading && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                        {projects.length} project{projects.length !== 1 ? "s" : ""}
                    </Badge>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects or owners…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Any role</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl w-full" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    {projects.length === 0 ? (
                        <>
                            <p className="text-lg font-medium text-muted-foreground">No collaborations yet</p>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                When someone invites you to their project as an editor or viewer,
                                it'll show up here.
                            </p>
                        </>
                    ) : (
                        <p className="text-muted-foreground">No projects match your filters.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((project) => {
                        const isOverdue =
                            project.due_date &&
                            project.status !== "done" &&
                            new Date(project.due_date) < new Date();
                        return (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/projects/${project.id}`)}
                                className="group w-full rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {/* Title + role */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{project.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColors[project.member_role]}`}>
                                                {project.member_role}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[project.status]}`}>
                                                {statusLabels[project.status] || project.status}
                                            </span>
                                        </div>

                                        {project.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                                        )}

                                        {/* Meta */}
                                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                                            <span>
                                                By{" "}
                                                <span className="font-medium text-foreground">
                                                    {project.owner_name || project.owner_email}
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground/40">·</span>
                                            <span>{priorityEmoji[project.priority]} {project.priority}</span>
                                            {project.due_date && (
                                                <>
                                                    <span className="text-muted-foreground/40">·</span>
                                                    <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                                                        <Calendar className="h-3 w-3" />
                                                        Due {format(new Date(project.due_date), "MMM d, yyyy")}
                                                        {isOverdue && " ⚠"}
                                                    </span>
                                                </>
                                            )}
                                            <span className="text-muted-foreground/40">·</span>
                                            <span>Joined {format(new Date(project.joined_at), "MMM d, yyyy")}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                                    >
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
