import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgRole } from "@prisma/client";

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function getUserMembership(userId: string, orgId: string) {
  return prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

export async function requireOrgMembership(userId: string, orgId: string) {
  const membership = await getUserMembership(userId, orgId);
  if (!membership) throw new Error("Not a member of this organization");
  return membership;
}

export function canManageMembers(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function canArchiveProject(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteProject(role: OrgRole): boolean {
  return role === "owner";
}

export function canManageOrgSettings(role: OrgRole): boolean {
  return role === "owner";
}

export function canChangeRole(
  actorRole: OrgRole,
  targetCurrentRole: OrgRole,
  newRole: OrgRole
): boolean {
  if (actorRole === "owner") {
    return true;
  }
  if (actorRole === "admin") {
    // Admins cannot promote to owner or change other admins/owners
    if (newRole === "owner") return false;
    if (targetCurrentRole === "owner" || targetCurrentRole === "admin")
      return false;
    return true;
  }
  return false;
}

export function canRemoveMember(
  actorRole: OrgRole,
  targetRole: OrgRole
): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") {
    return targetRole === "member";
  }
  return false;
}
