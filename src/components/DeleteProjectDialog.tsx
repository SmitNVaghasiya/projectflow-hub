import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectName: string;
}

export function DeleteProjectDialog({ open, onOpenChange, projectId, projectName }: Props) {
    const { deleteProject } = useProjects();
    const [confirmName, setConfirmName] = useState("");

    const handleDelete = async () => {
        await deleteProject.mutateAsync(projectId);
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={(val) => {
            if (!val) setConfirmName(""); // Reset on close
            onOpenChange(val);
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4 pt-2">
                            <p>
                                Are you sure you want to delete <strong>"{projectName}"</strong>? This action cannot be undone.
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Please type <strong>{projectName}</strong> to confirm.
                                </label>
                                <Input
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                    placeholder={projectName}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteProject.isPending || confirmName !== projectName}
                    >
                        {deleteProject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
