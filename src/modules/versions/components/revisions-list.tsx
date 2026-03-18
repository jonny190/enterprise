"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVersion } from "@/modules/versions/actions";
import { toast } from "sonner";

type Version = {
  id: string;
  revisionNumber: number;
  title: string;
  createdAt: string;
  createdBy: { name: string };
};

type RevisionsListProps = {
  projectId: string;
  revisions: Version[];
};

export function RevisionsList({ projectId, revisions }: RevisionsListProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const version = await createVersion(projectId, newTitle.trim());
      setNewTitle("");
      setAdding(false);
      router.push(`/project/${projectId}/revisions/${version.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create version");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Versions</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Version
        </Button>
      </div>

      {adding && (
        <div className="flex gap-2 rounded-lg border p-4">
          <Input
            placeholder="Version title (e.g. Phase 2 Features)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button onClick={handleCreate}>Create</Button>
          <Button variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); }}>Cancel</Button>
        </div>
      )}

      {revisions.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No versions yet. Create one to snapshot the current project state.
        </div>
      )}

      {revisions.map((rev) => (
        <div
          key={rev.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-accent/50"
          onClick={() => router.push(`/project/${projectId}/revisions/${rev.id}`)}
        >
          <Lock className="h-5 w-5 shrink-0 text-green-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                V{rev.revisionNumber}
              </span>
              <span className="font-medium">{rev.title}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              by {rev.createdBy.name} &middot; {new Date(rev.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
