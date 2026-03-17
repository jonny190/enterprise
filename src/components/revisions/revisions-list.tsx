"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRevision } from "@/actions/revisions";
import { toast } from "sonner";

type Revision = {
  id: string;
  revisionNumber: number;
  title: string;
  status: string;
  createdAt: string;
  _count: { changes: number };
  createdBy: { name: string };
};

type RevisionsListProps = {
  projectId: string;
  revisions: Revision[];
};

export function RevisionsList({ projectId, revisions }: RevisionsListProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const hasDraft = revisions.some((r) => r.status === "draft");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const revision = await createRevision(projectId, newTitle.trim());
      setNewTitle("");
      setAdding(false);
      router.push(`/project/${projectId}/revisions/${revision.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create revision");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revisions</h1>
        {!hasDraft && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Revision
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 rounded-lg border p-4">
          <Input
            placeholder="Revision title (e.g. Phase 2 Features)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button onClick={handleCreate}>Create</Button>
          <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}

      {revisions.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No revisions yet. Create one to start tracking changes.
        </div>
      )}

      {revisions.map((rev) => (
        <div
          key={rev.id}
          className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-accent/50"
          onClick={() => router.push(`/project/${projectId}/revisions/${rev.id}`)}
        >
          <div className="flex items-center gap-3">
            {rev.status === "finalized" ? (
              <Lock className="h-5 w-5 text-green-500" />
            ) : (
              <FileText className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  Rev {rev.revisionNumber}
                </span>
                <span className="font-medium">{rev.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    rev.status === "draft"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {rev.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {rev._count.changes} change{rev._count.changes !== 1 ? "s" : ""} -- by {rev.createdBy.name}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
