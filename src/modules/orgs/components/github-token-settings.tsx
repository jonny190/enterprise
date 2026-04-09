"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrganization } from "@/modules/orgs/actions";
import { toast } from "sonner";

export function GitHubTokenSettings({
  orgId,
  hasToken,
  repoVisibility,
}: {
  orgId: string;
  hasToken: boolean;
  repoVisibility: string;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState(repoVisibility);

  async function handleSave() {
    if (!token.trim()) return;
    setSaving(true);
    await updateOrganization(orgId, { githubToken: token.trim() });
    setSaving(false);
    setToken("");
    toast.success("GitHub token saved");
  }

  async function handleVisibilityChange(value: string) {
    setVisibility(value);
    await updateOrganization(orgId, { githubRepoVisibility: value });
    toast.success("Repository visibility updated");
  }

  async function handleClear() {
    if (!confirm("Remove the GitHub token? This will disable auto-PR creation for errors.")) return;
    setSaving(true);
    await updateOrganization(orgId, { githubToken: "" });
    setSaving(false);
    toast.success("GitHub token removed");
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">GitHub Integration</h3>
        <p className="text-xs text-gray-400 mt-1">
          Add a GitHub personal access token with <code className="text-xs bg-gray-800 px-1 rounded">repo</code> scope
          to enable automatic PR creation for error fixes.
        </p>
      </div>
      {hasToken ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-400">Token configured</span>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={!token.trim() || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
      {hasToken && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <label className="block text-sm font-medium mb-2">
            Default repository visibility
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleVisibilityChange("private")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                visibility === "private"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              Private
            </button>
            <button
              type="button"
              onClick={() => handleVisibilityChange("public")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                visibility === "public"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              Public
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
