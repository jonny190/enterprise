"use server";

import { prisma } from "@/lib/prisma";
import {
  requireSession,
  requireOrgMembership,
  canManageMembers,
  canManageOrgSettings,
  canChangeRole,
  canRemoveMember,
} from "@/lib/permissions";
import { sendInvitationEmail } from "@/lib/email";
import { OrgRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createOrganization(data: { name: string }) {
  const user = await requireSession();

  const slug = generateSlug(data.name);

  const existing = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existing) {
    return { error: "An organization with this name already exists" };
  }

  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug,
      memberships: {
        create: {
          userId: user.id,
          role: "owner",
        },
      },
    },
  });

  revalidatePath("/dashboard");
  return { success: true, slug: org.slug };
}

export async function updateOrganization(
  orgId: string,
  data: { name?: string; githubToken?: string; githubRepoVisibility?: string }
) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageOrgSettings(membership.role)) {
    return { error: "Only owners can update organization settings" };
  }

  const updateData: Record<string, string> = {};
  let slug: string | undefined;

  if (data.name) {
    slug = generateSlug(data.name);
    const existing = await prisma.organization.findFirst({
      where: { slug, NOT: { id: orgId } },
    });
    if (existing) {
      return { error: "An organization with this name already exists" };
    }
    updateData.name = data.name;
    updateData.slug = slug;
  }

  if (data.githubToken !== undefined) {
    updateData.githubToken = data.githubToken;
  }

  if (data.githubRepoVisibility !== undefined) {
    updateData.githubRepoVisibility = data.githubRepoVisibility;
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  revalidatePath(`/org/${org.slug}`);
  return { success: true, slug: org.slug };
}

export async function inviteMember(
  orgId: string,
  data: { email: string; role: OrgRole }
) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageMembers(membership.role)) {
    return { error: "You do not have permission to invite members" };
  }

  const existingMember = await prisma.orgMembership.findFirst({
    where: {
      orgId,
      user: { email: data.email.toLowerCase() },
    },
  });

  if (existingMember) {
    return { error: "This user is already a member" };
  }

  const existingInvite = await prisma.orgInvitation.findFirst({
    where: {
      orgId,
      email: data.email.toLowerCase(),
      status: "pending",
    },
  });

  if (existingInvite) {
    return { error: "An invitation has already been sent to this email" };
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  const inviter = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });

  const invitation = await prisma.orgInvitation.create({
    data: {
      orgId,
      email: data.email.toLowerCase(),
      role: data.role,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await sendInvitationEmail(
    data.email,
    org.name,
    inviter.name,
    invitation.token
  );

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function acceptInvitation(token: string) {
  const user = await requireSession();

  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== "pending") {
    return { error: "Invalid or expired invitation" };
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.orgInvitation.update({
      where: { token },
      data: { status: "expired" },
    });
    return { error: "This invitation has expired" };
  }

  if (invitation.email !== user.email) {
    return { error: "This invitation was sent to a different email address" };
  }

  await prisma.$transaction([
    prisma.orgMembership.create({
      data: {
        userId: user.id,
        orgId: invitation.orgId,
        role: invitation.role,
      },
    }),
    prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    }),
  ]);

  revalidatePath("/dashboard");
  return { success: true };
}

export async function revokeInvitation(orgId: string, invitationId: string) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageMembers(membership.role)) {
    return { error: "You do not have permission to manage invitations" };
  }

  await prisma.orgInvitation.delete({
    where: { id: invitationId, orgId },
  });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function changeMemberRole(
  orgId: string,
  targetUserId: string,
  newRole: OrgRole
) {
  const user = await requireSession();
  const actorMembership = await requireOrgMembership(user.id, orgId);
  const targetMembership = await requireOrgMembership(targetUserId, orgId);

  if (!canChangeRole(actorMembership.role, targetMembership.role, newRole)) {
    return { error: "You do not have permission to change this role" };
  }

  await prisma.orgMembership.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
  });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function removeMember(orgId: string, targetUserId: string) {
  const user = await requireSession();
  const actorMembership = await requireOrgMembership(user.id, orgId);
  const targetMembership = await requireOrgMembership(targetUserId, orgId);

  if (user.id === targetUserId) {
    return { error: "You cannot remove yourself" };
  }

  if (!canRemoveMember(actorMembership.role, targetMembership.role)) {
    return { error: "You do not have permission to remove this member" };
  }

  await prisma.orgMembership.delete({
    where: { id: targetMembership.id },
  });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  });

  revalidatePath(`/org/${org.slug}/members`);
  return { success: true };
}

export async function updateOrgBrand(
  orgId: string,
  data: {
    website: string;
    logoUrl: string;
    faviconUrl: string;
    brandColors: string;
    brandTone: string;
    brandDescription: string;
  }
) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);

  if (!canManageOrgSettings(membership.role)) {
    return { error: "Only owners can update brand settings" };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      website: data.website,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      brandColors: data.brandColors,
      brandTone: data.brandTone,
      brandDescription: data.brandDescription,
    },
  });

  return { success: true };
}

export async function getUserOrgs() {
  const user = await requireSession();

  return prisma.organization.findMany({
    where: {
      memberships: { some: { userId: user.id } },
    },
    include: {
      memberships: {
        where: { userId: user.id },
        select: { role: true },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { name: "asc" },
  });
}
