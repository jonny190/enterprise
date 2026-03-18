"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { OutputType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function saveGeneratedOutput(
  projectId: string,
  data: {
    outputType: OutputType;
    content: string;
    editedContent?: string;
    revisionNumber?: number | null;
    changesOnly?: boolean;
  }
) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
  });
  await requireOrgMembership(user.id, project.orgId);

  await prisma.generatedOutput.create({
    data: {
      projectId,
      outputType: data.outputType,
      content: data.content,
      editedContent: data.editedContent || null,
      revisionNumber: data.revisionNumber ?? null,
      changesOnly: data.changesOnly ?? false,
      generatedById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}/outputs`);
  return { success: true };
}

export async function updateOutputContent(
  outputId: string,
  editedContent: string
) {
  const output = await prisma.generatedOutput.findUniqueOrThrow({
    where: { id: outputId },
    include: { project: true },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, output.project.orgId);

  await prisma.generatedOutput.update({
    where: { id: outputId },
    data: { editedContent },
  });

  revalidatePath(`/project/${output.projectId}/outputs`);
  return { success: true };
}
