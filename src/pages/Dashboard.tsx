import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, CheckCircle2, Clock, AlertTriangle, Plus } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { ProjectCard } from "@/components/ProjectCard";

export default function Dashboard() {
  const { projects, isLoading, stats } = useProjects();
  const [newOpen, setNewOpen] = useState(false);

  const statCards = [
    { label: "Total Projects", value: stats.total, icon: FolderOpen, color: "text-primary" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-[hsl(142,71%,45%)]" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-[hsl(38,92%,50%)]" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-destructive" },
  ];

  const recentProjects = projects.slice(0, 6);

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your project portfolio</p>
        </div>
        <Button className="gradient-primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <div className="text-3xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <div className="flex items-center gap-4">
              <Progress value={stats.progressPercent} className="flex-1" />
              <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                {stats.progressPercent}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Projects</CardTitle>
          {projects.length > 6 && (
            <span className="text-sm text-muted-foreground">{projects.length} total</span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground font-medium">No projects yet.</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Click the button below to create your first project and start tracking your progress.
              </p>
              <div className="flex gap-3 mt-2 flex-wrap justify-center">
                <Button onClick={() => setNewOpen(true)} className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
