"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { snapshotProjectState } from "@/modules/versions/lib";
import { assertProjectEditable } from "@/lib/project-lock";

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
  const { project, user } = await getProjectWithAuth(projectId);
  assertProjectEditable(project);

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

// Mark the current working state ready to build: snapshot it into a new
// finalized version and lock the project so the spec can't change until it is
// unlocked (which starts a new version). Idempotent-safe: rejects if already
// locked.
export async function markReadyToBuild(projectId: string, title?: string) {
  const { project, user } = await getProjectWithAuth(projectId);
  if (project.lockedAt) {
    throw new Error("This project is already locked for building.");
  }

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
      title: title?.trim() || `V${nextNumber} (ready to build)`,
      status: "finalized",
      snapshot,
      createdById: user.id,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      lockedAt: new Date(),
      lockedById: user.id,
      buildReadyRevisionId: version.id,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return version;
}

// Unlock a build-ready project so the spec can be edited again. Any further
// changes belong to the next version.
export async function unlockForChanges(projectId: string) {
  const { project } = await getProjectWithAuth(projectId);
  if (!project.lockedAt) {
    return { success: true };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      lockedAt: null,
      lockedById: null,
      buildReadyRevisionId: null,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
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
