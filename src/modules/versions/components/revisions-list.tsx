"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, ArrowLeftRight, Pencil, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createVersion,
  markReadyToBuild,
  unlockForChanges,
} from "@/modules/versions/actions";
import { toast } from "sonner";

type Version = {
  id: string;
  revisionNumber: number;
  title: string;
  createdAt: string;
  createdBy: { name: string };
};

type Lock = {
  lockedAt: string;
  lockedByName: string;
  revisionNumber: number | null;
} | null;

type RevisionsListProps = {
  projectId: string;
  revisions: Version[];
  lock: Lock;
};

export function RevisionsList({ projectId, revisions, lock }: RevisionsListProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const locked = lock !== null;
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

  const handleMarkReady = async () => {
    setMarking(true);
    try {
      const version = await markReadyToBuild(projectId, newTitle.trim() || undefined);
      setNewTitle("");
      toast.success(`V${version.revisionNumber} locked and ready to build`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark ready to build");
      setMarking(false);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      await unlockForChanges(projectId);
      toast.success("Unlocked — you can edit again. Changes belong to a new version.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unlock");
      setUnlocking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Locked banner */}
      {locked ? (
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-400" />
                {lock!.revisionNumber
                  ? `V${lock!.revisionNumber} is ready to build`
                  : "This version is ready to build"}
              </h3>
              <p className="text-sm text-gray-400">
                The spec is locked, so requirements, meta, process flows and chat
                edits are frozen. Locked by {lock!.lockedByName} on{" "}
                {new Date(lock!.lockedAt).toLocaleDateString()}. Unlock to make
                changes — those changes will form the next version.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlock}
              disabled={unlocking}
              className="shrink-0"
            >
              <LockOpen className="mr-2 h-4 w-4" />
              {unlocking ? "Unlocking..." : "Unlock to make changes"}
            </Button>
          </div>
        </div>
      ) : revisions.length === 0 ? (
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

          {/* Ready to build checkbox: snapshots + locks in one step */}
          <label className="mt-4 flex items-start gap-2 border-t border-amber-900/40 pt-4 text-sm">
            <input
              type="checkbox"
              checked={false}
              disabled={marking}
              onChange={handleMarkReady}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Mark this version ready to build</span>
              <span className="block text-gray-400">
                Snapshots the current spec as V{nextVersionNumber} and locks it
                from further changes. Building proceeds from this locked version;
                additional changes require unlocking (a new version).
                {marking ? " Locking…" : ""}
              </span>
            </span>
          </label>
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
      {revisions.map((rev) => {
        const isBuildReady = locked && lock!.revisionNumber === rev.revisionNumber;
        return (
          <div
            key={rev.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-accent/50"
            onClick={() => router.push(`/project/${projectId}/revisions/${rev.id}`)}
          >
            <Lock
              className={`h-5 w-5 shrink-0 ${isBuildReady ? "text-green-400" : "text-green-500"}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  V{rev.revisionNumber}
                </span>
                <span className="font-medium">{rev.title}</span>
                {isBuildReady && (
                  <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-300">
                    Ready to build
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                by {rev.createdBy.name} &middot; {new Date(rev.createdAt).toLocaleDateString()}
              </div>
            </div>
            <span className="text-xs text-gray-600">View snapshot</span>
          </div>
        );
      })}
    </div>
  );
}
