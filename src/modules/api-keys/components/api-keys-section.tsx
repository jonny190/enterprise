"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createApiKey, revokeApiKey, deleteApiKey } from "@/modules/api-keys/actions";
import { API_SCOPES } from "@/lib/api-keys";
import type { ApiKeyView } from "@/modules/api-keys/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  orgId: string;
  apiKeys: ApiKeyView[];
  projects: { id: string; name: string }[];
  canManage: boolean;
}

const ALL_PROJECTS = "__all__";

function keyStatus(k: ApiKeyView): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (k.revokedAt) return { label: "Revoked", variant: "destructive" };
  if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now())
    return { label: "Expired", variant: "secondary" };
  return { label: "Active", variant: "default" };
}

export function ApiKeysSection({ orgId, apiKeys, projects, canManage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [projectId, setProjectId] = useState<string>(ALL_PROJECTS);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  function toggleScope(scope: string, checked: boolean) {
    setScopes((prev) =>
      checked ? [...new Set([...prev, scope])] : prev.filter((s) => s !== scope)
    );
  }

  function resetForm() {
    setName("");
    setScopes(["read"]);
    setProjectId(ALL_PROJECTS);
    setExpiresInDays("");
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createApiKey({
        orgId,
        name,
        scopes,
        projectId: projectId === ALL_PROJECTS ? null : projectId,
        expiresInDays: expiresInDays ? Number(expiresInDays) : null,
      });
      setNewToken(result.token);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await revokeApiKey(orgId, keyId);
      toast.success("Key revoked");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    }
  }

  async function handleDelete(keyId: string) {
    try {
      await deleteApiKey(orgId, keyId);
      toast.success("Key deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete key");
    }
  }

  function copyToken() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      toast.success("Copied to clipboard");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-gray-400">
            Programmatic access for the agent fleet and integrations.
          </p>
        </div>
        {canManage && (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setNewToken(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>Create key</Button>
            </DialogTrigger>
            <DialogContent>
              {newToken ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Copy your API key</DialogTitle>
                    <DialogDescription>
                      This is the only time the full key will be shown. Store it
                      somewhere safe.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md bg-gray-900 p-3 font-mono text-sm break-all">
                    {newToken}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={copyToken}>
                      Copy
                    </Button>
                    <Button
                      onClick={() => {
                        setNewToken(null);
                        setOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API key</DialogTitle>
                    <DialogDescription>
                      Grant only the scopes this key needs.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="key-name" className="block text-sm font-medium">
                        Name
                      </label>
                      <Input
                        id="key-name"
                        placeholder="Hermes fleet — production"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="block text-sm font-medium">Scopes</span>
                      <div className="space-y-2">
                        {API_SCOPES.map((scope) => (
                          <label
                            key={scope}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={scopes.includes(scope)}
                              onChange={(e) =>
                                toggleScope(scope, e.target.checked)
                              }
                            />
                            <span className="font-mono">{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="key-project"
                        className="block text-sm font-medium"
                      >
                        Restrict to project (optional)
                      </label>
                      <select
                        id="key-project"
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                      >
                        <option value={ALL_PROJECTS}>All projects in org</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="key-expiry"
                        className="block text-sm font-medium"
                      >
                        Expires in days (optional)
                      </label>
                      <Input
                        id="key-expiry"
                        type="number"
                        min={1}
                        placeholder="Never"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={loading || !name || scopes.length === 0}
                    >
                      {loading ? "Creating…" : "Create key"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {apiKeys.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-700 p-6 text-center text-sm text-gray-400">
          No API keys yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-800 rounded-md border border-gray-800">
          {apiKeys.map((k) => {
            const status = keyStatus(k);
            return (
              <li
                key={k.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="font-mono text-xs text-gray-400">
                    {k.prefix}…
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="outline" className="font-mono">
                        {s}
                      </Badge>
                    ))}
                    <Badge variant="secondary">
                      {k.projectName
                        ? `project: ${k.projectName}`
                        : "all projects"}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400">
                    {k.lastUsedAt
                      ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}`
                      : "Never used"}
                    {" · "}
                    {`created by ${k.createdByName}`}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    {!k.revokedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevoke(k.id)}
                      >
                        Revoke
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(k.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
