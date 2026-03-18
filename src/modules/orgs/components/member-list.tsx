"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { changeMemberRole, removeMember, revokeInvitation } from "@/modules/orgs/actions";
import { OrgRole } from "@prisma/client";

type Member = {
  id: string;
  userId: string;
  role: OrgRole;
  user: { name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
};

export function MemberList({
  orgId,
  members,
  invitations,
  currentUserRole,
  currentUserId,
}: {
  orgId: string;
  members: Member[];
  invitations: Invitation[];
  currentUserRole: OrgRole;
  currentUserId: string;
}) {
  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-400">
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              orgId={orgId}
              member={member}
              canManage={canManage}
              currentUserRole={currentUserRole}
              isSelf={member.userId === currentUserId}
            />
          ))}
        </div>
      </div>
      {invitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-gray-800 p-3"
              >
                <div>
                  <span className="text-sm">{inv.email}</span>
                  <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs">
                    {inv.role}
                  </span>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeInvitation(orgId, inv.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  orgId,
  member,
  canManage,
  currentUserRole,
  isSelf,
}: {
  orgId: string;
  member: Member;
  canManage: boolean;
  currentUserRole: OrgRole;
  isSelf: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: OrgRole) {
    setLoading(true);
    await changeMemberRole(orgId, member.userId, newRole);
    setLoading(false);
  }

  async function handleRemove() {
    if (!confirm(`Remove ${member.user.name} from the organization?`)) return;
    setLoading(true);
    await removeMember(orgId, member.userId);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-800 p-3">
      <div>
        <span className="text-sm font-medium">{member.user.name}</span>
        <span className="ml-2 text-xs text-gray-500">{member.user.email}</span>
        <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs">
          {member.role}
        </span>
        {isSelf && (
          <span className="ml-1 text-xs text-gray-500">(you)</span>
        )}
      </div>
      {canManage && !isSelf && (
        <div className="flex gap-2">
          {currentUserRole === "owner" && member.role !== "owner" && (
            <select
              className="h-8 rounded border border-gray-700 bg-gray-800 px-2 text-xs"
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value as OrgRole)}
              disabled={loading}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={loading}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
