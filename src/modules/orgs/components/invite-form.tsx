"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember } from "@/modules/orgs/actions";
import { OrgRole } from "@prisma/client";
import { Copy, Check } from "lucide-react";

export function InviteForm({ orgId }: { orgId: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setInviteLink("");

    const formData = new FormData(e.currentTarget);
    const result = await inviteMember(orgId, {
      email: formData.get("email") as string,
      role: formData.get("role") as OrgRole,
    });

    if (result.error) {
      setError(result.error);
    } else if (result.inviteLink) {
      setInviteLink(result.inviteLink);
      setSuccess("Invitation created! Share the link below with the user.");
      (e.target as HTMLFormElement).reset();
    } else {
      setSuccess("Invitation sent!");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
            defaultValue="member"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Invite"}
        </Button>
        {error && <span className="text-sm text-red-500">{error}</span>}
        {success && !inviteLink && (
          <span className="text-sm text-green-500">{success}</span>
        )}
      </form>
      {inviteLink && (
        <div className="rounded-md border border-blue-800 bg-blue-950/50 p-3 space-y-2">
          <p className="text-sm text-blue-300">{success}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-900 px-3 py-2 text-xs text-gray-300 overflow-x-auto">
              {inviteLink}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
