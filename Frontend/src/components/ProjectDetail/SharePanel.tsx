import { useState } from "react";
import { Users, ChevronDown, ChevronRight, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiGetProjectMembers, apiInviteMember, apiRemoveMember, type ApiProject, type ApiMember } from "@/lib/api";

export function SharePanel({ project, isOwner }: { project: ApiProject; isOwner: boolean }) {
    const [showShare, setShowShare] = useState(false);
    const [members, setMembers] = useState<ApiMember[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
    const { toast } = useToast();

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <button
                onClick={() => {
                    if (!showShare) {
                        apiGetProjectMembers(project.id).then(({ data }) => {
                            if (data) setMembers(data.members);
                        });
                    }
                    setShowShare(!showShare);
                }}
                className="w-full flex items-center gap-2 px-6 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
            >
                <Users className="h-4 w-4 text-muted-foreground" />
                Share & Collaborators
                {showShare ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
            </button>
            {showShare && (
                <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
                    {isOwner && (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Email address…"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="flex-1 text-sm"
                            />
                            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}>
                                <SelectTrigger className="w-28 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                size="sm"
                                className="gradient-primary shrink-0"
                                onClick={async () => {
                                    if (!inviteEmail.trim()) return;
                                    const { error } = await apiInviteMember(project.id, inviteEmail.trim(), inviteRole);
                                    if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
                                    toast({ title: "Invited!", description: `${inviteEmail} has been invited as ${inviteRole}.` });
                                    setInviteEmail("");
                                    const { data } = await apiGetProjectMembers(project.id);
                                    if (data) setMembers(data.members);
                                }}
                            >
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No collaborators yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border bg-muted/10">
                                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {m.display_name?.slice(0, 2).toUpperCase() || m.email.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{m.display_name || m.email}</p>
                                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground capitalize border border-border rounded px-1.5 py-0.5">{m.role}</span>
                                    {isOwner && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button className="text-muted-foreground hover:text-destructive transition-colors">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove collaborator?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove {m.display_name || m.email} from this project? They will lose access immediately.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={async () => {
                                                            await apiRemoveMember(project.id, m.id);
                                                            setMembers(prev => prev.filter(x => x.id !== m.id));
                                                            toast({ title: "Member removed" });
                                                        }}
                                                    >
                                                        Remove
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

