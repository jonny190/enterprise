"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createApiKey, revokeApiKey, deleteApiKey } from "@/modules/api-keys/actions";
import { API_SCOPES } from "@/lib/api-keys";
import type { ApiKeyView } from "@/modules/api-keys/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  orgId: string;
  apiKeys: ApiKeyView[];
  projects: { id: string; name: string }[];
  canManage: boolean;
}

const ALL_PROJECTS = "__all__";

function keyStatus(k: ApiKeyView): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
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
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-muted-foreground text-sm">
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
                  <div className="bg-muted rounded-md p-3 font-mono text-sm break-all">
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
                      <Label htmlFor="key-name">Name</Label>
                      <Input
                        id="key-name"
                        placeholder="Hermes fleet — production"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="space-y-2">
                        {API_SCOPES.map((scope) => (
                          <label
                            key={scope}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={scopes.includes(scope)}
                              onCheckedChange={(c) =>
                                toggleScope(scope, c === true)
                              }
                            />
                            <span className="font-mono">{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Restrict to project (optional)</Label>
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_PROJECTS}>
                            All projects in org
                          </SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="key-expiry">
                        Expires in days (optional)
                      </Label>
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
        <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          No API keys yet.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
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
                  <div className="text-muted-foreground font-mono text-xs">
                    {k.prefix}…
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="outline" className="font-mono">
                        {s}
                      </Badge>
                    ))}
                    <Badge variant="secondary">
                      {k.projectName ? `project: ${k.projectName}` : "all projects"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">
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
