"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { FlowType } from "@prisma/client";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);
  return project;
}

export async function createProcessFlow(
  projectId: string,
  name: string,
  flowType: FlowType
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.processFlow.count({ where: { projectId } });
  const flow = await prisma.processFlow.create({
    data: {
      projectId,
      name,
      flowType,
      diagramData: { nodes: [], edges: [] },
      sortOrder: count,
    },
  });
  revalidatePath(`/project/${projectId}`);
  return flow;
}

export async function updateProcessFlow(
  id: string,
  projectId: string,
  data: { name?: string; description?: string; flowType?: FlowType }
) {
  await getProjectWithAuth(projectId);
  await prisma.processFlow.update({ where: { id }, data });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateDiagramData(
  id: string,
  projectId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diagramData: any
) {
  await getProjectWithAuth(projectId);
  await prisma.processFlow.update({
    where: { id },
    data: { diagramData },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function deleteProcessFlow(id: string, projectId: string) {
  await getProjectWithAuth(projectId);
  await prisma.processFlow.delete({ where: { id } });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function reorderProcessFlows(
  projectId: string,
  orderedIds: string[]
) {
  await getProjectWithAuth(projectId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.processFlow.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
