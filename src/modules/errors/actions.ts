"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { type ErrorStatus } from "@prisma/client";

export async function createErrorLog(
  projectId: string,
  data: { title: string; stackTrace?: string; context?: string; source?: string }
) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);

  const error = await prisma.errorLog.create({
    data: {
      projectId,
      title: data.title,
      stackTrace: data.stackTrace || "",
      context: data.context || "",
      source: data.source || "",
      createdById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}/errors`);
  return error;
}

export async function updateErrorStatus(id: string, status: ErrorStatus) {
  const user = await requireSession();
  const error = await prisma.errorLog.findUniqueOrThrow({
    where: { id },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, error.project.orgId);

  await prisma.errorLog.update({ where: { id }, data: { status } });
  revalidatePath(`/project/${error.projectId}/errors`);
  return { success: true };
}

export async function deleteErrorLog(id: string) {
  const user = await requireSession();
  const error = await prisma.errorLog.findUniqueOrThrow({
    where: { id },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, error.project.orgId);

  await prisma.errorLog.delete({ where: { id } });
  revalidatePath(`/project/${error.projectId}/errors`);
  return { success: true };
}

export async function addErrorNote(
  errorId: string,
  content: string,
  type: "comment" | "resolution" = "comment"
) {
  const user = await requireSession();
  const error = await prisma.errorLog.findUniqueOrThrow({
    where: { id: errorId },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, error.project.orgId);

  await prisma.errorNote.create({
    data: { errorLogId: errorId, userId: user.id, content, type },
  });

  // If it's a resolution note, mark as resolved
  if (type === "resolution") {
    await prisma.errorLog.update({
      where: { id: errorId },
      data: { status: "resolved" },
    });
  }

  revalidatePath(`/project/${error.projectId}/errors`);
  return { success: true };
}

export async function addErrorPR(errorId: string, url: string, title: string, type: "pr" | "commit" = "pr") {
  const user = await requireSession();
  const error = await prisma.errorLog.findUniqueOrThrow({
    where: { id: errorId },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, error.project.orgId);

  await prisma.errorPR.create({
    data: { errorLogId: errorId, url, title, type, addedById: user.id },
  });

  revalidatePath(`/project/${error.projectId}/errors`);
  return { success: true };
}
