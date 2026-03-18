"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { snapshotProjectState } from "@/lib/revisions";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);
  return { project, user };
}

export async function createVersion(projectId: string, title: string) {
  const { user } = await getProjectWithAuth(projectId);

  const snapshot = await snapshotProjectState(projectId);

  const lastVersion = await prisma.revision.findFirst({
    where: { projectId },
    orderBy: { revisionNumber: "desc" },
  });
  const nextNumber = (lastVersion?.revisionNumber ?? 0) + 1;

  const version = await prisma.revision.create({
    data: {
      projectId,
      revisionNumber: nextNumber,
      title,
      status: "finalized",
      snapshot,
      createdById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return version;
}

export async function deleteVersion(id: string) {
  const user = await requireSession();
  const revision = await prisma.revision.findUniqueOrThrow({
    where: { id },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, revision.project.orgId);

  const latest = await prisma.revision.findFirst({
    where: { projectId: revision.projectId },
    orderBy: { revisionNumber: "desc" },
  });
  if (latest?.id !== id) throw new Error("Can only delete the most recent version");

  await prisma.revision.delete({ where: { id } });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}
