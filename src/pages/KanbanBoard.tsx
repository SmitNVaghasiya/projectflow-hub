import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, GripVertical } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import type { Project, ProjectStatus } from "@/hooks/useProjects";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { ProjectCard } from "@/components/ProjectCard";

const columns: { id: ProjectStatus; title: string; dotClass: string }[] = [
  { id: "todo", title: "To Do", dotClass: "bg-muted-foreground" },
  { id: "in_progress", title: "In Progress", dotClass: "bg-[hsl(38,92%,50%)]" },
  { id: "done", title: "Done", dotClass: "bg-[hsl(142,71%,45%)]" },
];

export default function KanbanBoard() {
  const { projects, isLoading, updateProject } = useProjects();
  const [newOpen, setNewOpen] = useState(false);

  const getColumnProjects = (status: ProjectStatus) =>
    projects.filter((p) => p.status === status);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as ProjectStatus;
    const project = projects.find((p) => p.id === draggableId);
    if (!project || project.status === newStatus) return;
    updateProject.mutate({ id: draggableId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-muted-foreground mt-1">Drag and drop projects between columns</p>
        </div>
        <Button className="gradient-primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[60vh]">
          {columns.map((col) => {
            const colProjects = getColumnProjects(col.id);
            return (
              <div key={col.id} className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.dotClass}`} />
                  <h2 className="font-semibold text-sm uppercase tracking-wider">{col.title}</h2>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {isLoading ? "—" : colProjects.length}
                  </Badge>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-xl border border-dashed p-3 space-y-3 min-h-[200px] transition-colors ${snapshot.isDraggingOver
                          ? "border-primary/60 bg-primary/5"
                          : "border-border bg-muted/30"
                        }`}
                    >
                      {isLoading ? (
                        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                      ) : colProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                          <p className="text-sm text-muted-foreground">No projects</p>
                        </div>
                      ) : (
                        colProjects.map((project, index) => (
                          <Draggable key={project.id} draggableId={project.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`transition-opacity ${snapshot.isDragging ? "opacity-70" : ""}`}
                              >
                                <div className="relative">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="pl-6">
                                    <ProjectCard project={project} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
