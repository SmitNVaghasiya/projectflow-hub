import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, CheckCircle2, Clock, AlertTriangle, Plus, Trophy, Zap,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { ProjectCard } from "@/components/ProjectCard";
import {
  ContributionGraph,
  ContributionGraphCalendar,
  ContributionGraphBlock,
  ContributionGraphFooter,
} from "@/components/kibo-ui/contribution-graph";
import { apiGetActivityGraph, apiGetBadges, type ActivityDay, type ApiBadge } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { projects, isLoading, stats } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [badges, setBadges] = useState<ApiBadge[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    (async () => {
      const [graphRes, badgesRes] = await Promise.all([
        apiGetActivityGraph(),
        apiGetBadges(),
      ]);
      if (graphRes.data) setActivityData(graphRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
      setLoadingActivity(false);
    })();
  }, []);

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
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

      {/* Contribution Graph */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <CardTitle className="text-lg">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (
            <ContributionGraph data={activityData}>
              <ContributionGraphCalendar>
                {({ activity, dayIndex, weekIndex }) => (
                  <ContributionGraphBlock
                    activity={activity}
                    dayIndex={dayIndex}
                    weekIndex={weekIndex}
                    className={cn(
                      'data-[level="0"]:bg-muted dark:data-[level="0"]:bg-muted/40',
                      'data-[level="1"]:bg-primary/20',
                      'data-[level="2"]:bg-primary/45',
                      'data-[level="3"]:bg-primary/70',
                      'data-[level="4"]:bg-primary',
                    )}
                  />
                )}
              </ContributionGraphCalendar>
              <ContributionGraphFooter />
            </ContributionGraph>
          )}
        </CardContent>
      </Card>

      {/* Badges */}
      {(badges.length > 0 || !loadingActivity) && (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-lg">Achievements</CardTitle>
            {badges.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{badges.length} earned</span>
            )}
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-28 rounded-xl" />)}
              </div>
            ) : badges.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No badges yet — start completing projects and tasks!</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    title={`${badge.description}\nEarned: ${format(new Date(badge.earned_at), "MMM d, yyyy")}`}
                    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-default min-w-[80px]"
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
