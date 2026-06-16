"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createComment, deleteComment } from "@/lib/actions/comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Send,
  Trash2,
  Eye,
  Lock,
} from "lucide-react";

interface Comment {
  id: string;
  body: string;
  visibility: string;
  authorName: string | null;
  authorEmail: string | null;
  source: string;
  createdAt: Date | string;
}

interface CommentListProps {
  entityType: "project" | "task" | "file" | "invoice";
  entityId: string;
  initialComments: Comment[];
}

export function CommentList({ entityType, entityId, initialComments }: CommentListProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const comment = await createComment({
        entityType,
        entityId,
        body: body.trim(),
        visibility,
      });
      setComments((prev) => [comment as Comment, ...prev]);
      setBody("");
      toast.success("Comment added");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setLoading(false);
    }
  }, [body, visibility, entityType, entityId, router]);

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    }
  }, [router]);

  function getInitials(name: string | null, email: string | null): string {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return "??";
  }

  return (
    <div className="space-y-4">
      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={visibility === "internal" ? "secondary" : "outline"}
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => setVisibility("internal")}
            >
              <Lock className="h-3 w-3" /> Internal
            </Button>
            <Button
              type="button"
              variant={visibility === "client" ? "secondary" : "outline"}
              size="sm"
              className="gap-1 text-xs h-7"
              onClick={() => setVisibility("client")}
            >
              <Eye className="h-3 w-3" /> Client
            </Button>
          </div>
          <Button type="submit" size="sm" disabled={loading || !body.trim()} className="gap-1">
            <Send className="h-3 w-3" /> {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>

      <Separator />

      {/* Comment list */}
      {comments.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No comments yet. Be the first to comment.
        </div>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 group">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {getInitials(comment.authorName, comment.authorEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {comment.authorName || comment.authorEmail || "Unknown"}
                </span>
                {comment.source === "portal" && (
                  <Badge variant="outline" className="text-[10px] h-5">Portal</Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-[10px] h-5"
                >
                  {comment.visibility === "internal" ? (
                    <><Lock className="h-2.5 w-2.5 mr-0.5" /> Internal</>
                  ) : (
                    <><Eye className="h-2.5 w-2.5 mr-0.5" /> Client</>
                  )}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{comment.body}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 mt-1"
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
