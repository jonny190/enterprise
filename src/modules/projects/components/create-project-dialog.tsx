"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProject } from "@/modules/projects/actions";
import { slugifyRepoName } from "@/modules/github/lib/slugify";
import { toast } from "sonner";

export function CreateProjectDialog({
  orgId,
  hasGithubToken,
}: {
  orgId: string;
  hasGithubToken: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoNameEdited, setRepoNameEdited] = useState(false);

  function handleProjectNameChange(value: string) {
    setProjectName(value);
    if (!repoNameEdited && hasGithubToken) {
      setRepoName(slugifyRepoName(value));
    }
  }

  function handleRepoNameChange(value: string) {
    setRepoName(slugifyRepoName(value));
    setRepoNameEdited(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createProject(orgId, {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      repoName: hasGithubToken ? repoName || undefined : undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    } else {
      if (result.repoWarning) {
        toast.warning(result.repoWarning);
      }
      setOpen(false);
      router.push(`/project/${result.projectId}/wizard`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New Project</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Project name
            </label>
            <Input
              id="name"
              name="name"
              required
              value={projectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium"
            >
              Description (optional)
            </label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          {hasGithubToken ? (
            <div>
              <label htmlFor="repoName" className="block text-sm font-medium">
                Repository name (optional)
              </label>
              <Input
                id="repoName"
                value={repoName}
                onChange={(e) => handleRepoNameChange(e.target.value)}
                placeholder="my-project"
                className="font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                A GitHub repository will be created with this name
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Add a GitHub token in org settings to auto-create repos
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
