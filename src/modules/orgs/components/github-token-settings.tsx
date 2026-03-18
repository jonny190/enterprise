"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrganization } from "@/modules/orgs/actions";
import { toast } from "sonner";

export function GitHubTokenSettings({
  orgId,
  hasToken,
}: {
  orgId: string;
  hasToken: boolean;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token.trim()) return;
    setSaving(true);
    await updateOrganization(orgId, { githubToken: token.trim() });
    setSaving(false);
    setToken("");
    toast.success("GitHub token saved");
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
    </div>
  );
}
