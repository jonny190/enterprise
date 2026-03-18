"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveProject,
  deleteProject,
  updateProjectGitRepo,
} from "@/modules/projects/actions";
import { OrgRole, ProjectStatus } from "@prisma/client";
import { toast } from "sonner";

export function ProjectSettingsClient({
  projectId,
  projectName,
  projectStatus,
  gitRepo,
  orgSlug,
  userRole,
  isCreator,
}: {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  gitRepo: string;
  orgSlug: string;
  userRole: OrgRole;
  isCreator: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState(gitRepo);
  const [savingRepo, setSavingRepo] = useState(false);

  const canArchive =
    isCreator || userRole === "owner" || userRole === "admin";
  const canDelete = userRole === "owner";

  async function handleSaveRepo() {
    setSavingRepo(true);
    await updateProjectGitRepo(projectId, repoUrl);
    setSavingRepo(false);
    toast.success("Repository saved");
    router.refresh();
  }

  async function handleArchive() {
    setLoading(true);
    await archiveProject(projectId);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${projectName}"? This cannot be undone.`
      )
    )
      return;
    setLoading(true);
    await deleteProject(projectId);
    router.push(`/org/${orgSlug}/projects`);
  }

  return (
    <div className="max-w-md space-y-8">
      <div className="rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium">Git Repository</h3>
        <p className="mt-1 text-xs text-gray-400">
          Link a repository to this project. This will be included in version
          snapshots and passed to AI generation for better context.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="https://github.com/org/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleSaveRepo}
            disabled={savingRepo || repoUrl === gitRepo}
          >
            {savingRepo ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      {canArchive && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium">Archive Project</h3>
          <p className="mt-1 text-xs text-gray-400">
            {projectStatus === "archived"
              ? "This project is archived. Unarchive to make it visible again."
              : "Archived projects are hidden from the default list."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleArchive}
            disabled={loading}
          >
            {projectStatus === "archived" ? "Unarchive" : "Archive"}
          </Button>
        </div>
      )}
      {canDelete && (
        <div className="rounded-lg border border-red-900/50 p-4">
          <h3 className="text-sm font-medium text-red-400">Delete Project</h3>
          <p className="mt-1 text-xs text-gray-400">
            Permanently removes this project from all views.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete Project
          </Button>
        </div>
      )}
    </div>
  );
}
