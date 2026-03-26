"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Lock, ArrowLeftRight, Pencil, Save } from "lucide-react";
import Link from "next/link";
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
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const latestVersion = revisions.length > 0 ? revisions[revisions.length - 1] : null;
  const nextVersionNumber = (latestVersion?.revisionNumber ?? 0) + 1;

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const version = await createVersion(projectId, newTitle.trim());
      setNewTitle("");
      toast.success(`V${version.revisionNumber} created`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create version");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow banner */}
      {revisions.length === 0 ? (
        <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-5">
          <h3 className="font-semibold mb-1">Get started with versioning</h3>
          <p className="text-sm text-gray-400 mb-3">
            Create V1 to snapshot your current project state as a baseline. You can build out requirements
            first using the Wizard, or create V1 now and iterate from there.
          </p>
          <div className="flex items-center gap-2">
            <Link href={`/project/${projectId}/wizard`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Go to Wizard
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-700 mx-1" />
            <Input
              placeholder="V1 title (e.g. Initial baseline)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-64"
            />
            <Button size="sm" onClick={handleCreate} disabled={saving || !newTitle.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Creating..." : "Create V1"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-amber-400" />
                Working on V{nextVersionNumber}
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                Any changes you make to the project (via Requirements, Meta, Chat, etc.)
                will be captured when you save V{nextVersionNumber}. Edit freely, then snapshot when ready.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/project/${projectId}/requirements`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Requirements
              </Button>
            </Link>
            <Link href={`/project/${projectId}/chat`}>
              <Button variant="outline" size="sm">
                Chat to Add
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-700 mx-1" />
            <Input
              placeholder={`V${nextVersionNumber} title (e.g. ${nextVersionNumber === 2 ? "Phase 2 updates" : "Sprint " + nextVersionNumber + " changes"})`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-64"
            />
            <Button onClick={handleCreate} disabled={!newTitle.trim() || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : `Save as V${nextVersionNumber}`}
            </Button>
          </div>
        </div>
      )}

      {/* Actions bar */}
      {revisions.length > 0 && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Version History</h2>
          {revisions.length >= 2 && (
            <Link href={`/project/${projectId}/revisions/compare`}>
              <Button variant="outline" size="sm">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Compare Versions
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Version list */}
      {revisions.map((rev) => (
        <div
          key={rev.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-accent/50"
          onClick={() => router.push(`/project/${projectId}/revisions/${rev.id}`)}
        >
          <Lock className="h-5 w-5 shrink-0 text-green-500" />
          <div className="flex-1">
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
          <span className="text-xs text-gray-600">View snapshot</span>
        </div>
      ))}
    </div>
  );
}
