"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { ChangeType, TargetType } from "@prisma/client";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);
  return { project, user };
}

async function getRevisionWithAuth(revisionId: string) {
  const revision = await prisma.revision.findUniqueOrThrow({
    where: { id: revisionId },
    include: { project: { include: { org: true } } },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, revision.project.orgId);
  return { revision, user };
}

export async function createRevision(projectId: string, title: string) {
  const { user } = await getProjectWithAuth(projectId);

  const existingDraft = await prisma.revision.findFirst({
    where: { projectId, status: "draft" },
  });
  if (existingDraft) throw new Error("A draft revision already exists");

  const lastRevision = await prisma.revision.findFirst({
    where: { projectId },
    orderBy: { revisionNumber: "desc" },
  });
  const nextNumber = (lastRevision?.revisionNumber ?? 0) + 1;

  const revision = await prisma.revision.create({
    data: {
      projectId,
      revisionNumber: nextNumber,
      title,
      createdById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return revision;
}

export async function updateRevision(
  id: string,
  data: { title?: string; description?: string }
) {
  const { revision } = await getRevisionWithAuth(id);
  if (revision.status !== "draft") throw new Error("Cannot edit finalized revision");

  await prisma.revision.update({ where: { id }, data });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}

export async function finalizeRevision(id: string) {
  const { revision } = await getRevisionWithAuth(id);
  if (revision.status !== "draft") throw new Error("Already finalized");

  await prisma.revision.update({
    where: { id },
    data: { status: "finalized" },
  });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}

export async function deleteRevision(id: string) {
  const { revision } = await getRevisionWithAuth(id);
  if (revision.status !== "draft") throw new Error("Cannot delete finalized revision");

  await prisma.revision.delete({ where: { id } });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}

export async function addChange(
  revisionId: string,
  changeType: ChangeType,
  targetType: TargetType,
  targetId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const { revision } = await getRevisionWithAuth(revisionId);
  if (revision.status !== "draft") throw new Error("Cannot modify finalized revision");

  const change = await prisma.revisionChange.create({
    data: {
      revisionId,
      changeType,
      targetType,
      targetId,
      data,
    },
  });
  revalidatePath(`/project/${revision.projectId}`);
  return change;
}

export async function updateChange(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changeData: any
) {
  const change = await prisma.revisionChange.findUniqueOrThrow({
    where: { id },
    include: { revision: { include: { project: { include: { org: true } } } } },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, change.revision.project.orgId);
  if (change.revision.status !== "draft") throw new Error("Cannot modify finalized revision");

  await prisma.revisionChange.update({
    where: { id },
    data: { data: changeData },
  });
  revalidatePath(`/project/${change.revision.projectId}`);
  return { success: true };
}

export async function deleteChange(id: string) {
  const change = await prisma.revisionChange.findUniqueOrThrow({
    where: { id },
    include: { revision: { include: { project: { include: { org: true } } } } },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, change.revision.project.orgId);
  if (change.revision.status !== "draft") throw new Error("Cannot modify finalized revision");

  await prisma.revisionChange.delete({ where: { id } });
  revalidatePath(`/project/${change.revision.projectId}`);
  return { success: true };
}
