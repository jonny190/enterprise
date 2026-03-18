"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember } from "@/modules/orgs/actions";
import { OrgRole } from "@prisma/client";

export function InviteForm({ orgId }: { orgId: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const result = await inviteMember(orgId, {
      email: formData.get("email") as string,
      role: formData.get("role") as OrgRole,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Invitation sent!");
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
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
      {success && <span className="text-sm text-green-500">{success}</span>}
    </form>
  );
}
