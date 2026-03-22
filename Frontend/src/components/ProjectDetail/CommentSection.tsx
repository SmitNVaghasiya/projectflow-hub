import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronRight, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiGetComments, apiCreateComment, apiDeleteComment, type ApiProject, type ApiComment } from "@/lib/api";
import { format } from "date-fns";

export function CommentSection({ project, isViewer }: { project: ApiProject; isViewer: boolean }) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<ApiComment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const { toast } = useToast();

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <button
                onClick={() => {
                    if (!showComments) {
                        apiGetComments(project.id).then(({ data }) => {
                            if (data) setComments(data);
                        });
                    }
                    setShowComments(!showComments);
                }}
                className="w-full flex items-center gap-2 px-6 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
            >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comments
                {comments.length > 0 && <span className="text-xs text-muted-foreground ml-1">({comments.length})</span>}
                {showComments ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
            </button>
            {showComments && (
                <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
                    <div className="space-y-3">
                        {comments.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No comments yet. Be the first!</p>
                        )}
                        {comments.map((c) => (
                            <div key={c.id} className="group flex gap-3">
                                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                                    {(c.display_name || c.email).slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-semibold">{c.display_name || c.email}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(c.created_at), "MMM d, h:mm a")}
                                        </span>
                                    </div>
                                    <p className="text-sm leading-relaxed mt-0.5">{c.content}</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        await apiDeleteComment(c.id);
                                        setComments(prev => prev.filter(x => x.id !== c.id));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive self-start mt-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {!isViewer && (
                        <div className="flex gap-2">
                            <Textarea
                                placeholder="Write a comment…"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        if (!commentText.trim()) return;
                                        setPostingComment(true);
                                        const { data, error } = await apiCreateComment(project.id, commentText.trim());
                                        setPostingComment(false);
                                        if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
                                        if (data) setComments(prev => [...prev, data]);
                                        setCommentText("");
                                    }
                                }}
                                className="flex-1 min-h-[60px] resize-none text-sm"
                                rows={2}
                            />
                            <Button
                                size="sm"
                                className="gradient-primary self-end shrink-0"
                                disabled={postingComment || !commentText.trim()}
                                onClick={async () => {
                                    if (!commentText.trim()) return;
                                    setPostingComment(true);
                                    const { data, error } = await apiCreateComment(project.id, commentText.trim());
                                    setPostingComment(false);
                                    if (error) { toast({ title: "Error", description: error, variant: "destructive" }); return; }
                                    if (data) setComments(prev => [...prev, data]);
                                    setCommentText("");
                                }}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

