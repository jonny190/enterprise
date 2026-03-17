"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRevision, finalizeRevision, deleteRevision } from "@/actions/revisions";
import { useRouter } from "next/navigation";
import { Lock, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

type RevisionHeaderProps = {
  revisionId: string;
  projectId: string;
  title: string;
  revisionNumber: number;
  status: string;
  changeCount: number;
};

export function RevisionHeader({
  revisionId,
  projectId,
  title,
  revisionNumber,
  status,
  changeCount,
}: RevisionHeaderProps) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const isDraft = status === "draft";

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) return;
    await updateRevision(revisionId, { title: titleValue.trim() });
    setEditingTitle(false);
  };

  const handleFinalize = async () => {
    if (!confirm("Finalize this revision? This cannot be undone.")) return;
    await finalizeRevision(revisionId);
    toast.success("Revision finalized");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft revision?")) return;
    await deleteRevision(revisionId);
    router.push(`/project/${projectId}/revisions`);
  };

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-muted px-2 py-1 text-sm font-mono">
          Rev {revisionNumber}
        </span>
        {isDraft && editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            className="w-64"
            autoFocus
          />
        ) : (
          <h2
            className={`text-lg font-semibold ${isDraft ? "cursor-pointer hover:text-muted-foreground" : ""}`}
            onClick={() => isDraft && setEditingTitle(true)}
          >
            {title}
          </h2>
        )}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isDraft
              ? "bg-amber-500/20 text-amber-400"
              : "bg-green-500/20 text-green-400"
          }`}
        >
          {isDraft ? "Draft" : "Finalized"}
        </span>
        <span className="text-sm text-muted-foreground">
          {changeCount} change{changeCount !== 1 ? "s" : ""}
        </span>
      </div>
      {isDraft && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleFinalize}>
            <Check className="mr-2 h-4 w-4" />
            Finalize
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
      {!isDraft && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Read-only
        </div>
      )}
    </div>
  );
}
