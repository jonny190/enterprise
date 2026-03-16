"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { Priority, RequirementType } from "@prisma/client";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });

  await requireOrgMembership(user.id, project.orgId);
  return project;
}

// Objectives
export async function addObjective(
  projectId: string,
  data: { title: string; successCriteria: string }
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.objective.count({ where: { projectId } });
  await prisma.objective.create({
    data: { projectId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateObjective(
  id: string,
  data: { title: string; successCriteria: string }
) {
  const obj = await prisma.objective.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(obj.projectId);
  await prisma.objective.update({ where: { id }, data });
  revalidatePath(`/project/${obj.projectId}`);
  return { success: true };
}

export async function deleteObjective(id: string) {
  const obj = await prisma.objective.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(obj.projectId);
  await prisma.objective.delete({ where: { id } });
  revalidatePath(`/project/${obj.projectId}`);
  return { success: true };
}

export async function reorderObjectives(
  projectId: string,
  orderedIds: string[]
) {
  await getProjectWithAuth(projectId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.objective.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

// User Stories
export async function addUserStory(
  projectId: string,
  data: { role: string; capability: string; benefit: string; priority: Priority }
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.userStory.count({ where: { projectId } });
  await prisma.userStory.create({
    data: { projectId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateUserStory(
  id: string,
  data: { role: string; capability: string; benefit: string; priority: Priority }
) {
  const story = await prisma.userStory.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(story.projectId);
  await prisma.userStory.update({ where: { id }, data });
  revalidatePath(`/project/${story.projectId}`);
  return { success: true };
}

export async function deleteUserStory(id: string) {
  const story = await prisma.userStory.findUniqueOrThrow({ where: { id } });
  await getProjectWithAuth(story.projectId);
  await prisma.userStory.delete({ where: { id } });
  revalidatePath(`/project/${story.projectId}`);
  return { success: true };
}

export async function reorderUserStories(
  projectId: string,
  orderedIds: string[]
) {
  await getProjectWithAuth(projectId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.userStory.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

// Requirements (NFRs, Constraints, etc.)
export async function addRequirement(
  categoryId: string,
  data: { title: string; description: string; priority: Priority }
) {
  const cat = await prisma.requirementCategory.findUniqueOrThrow({
    where: { id: categoryId },
  });
  await getProjectWithAuth(cat.projectId);
  const count = await prisma.requirement.count({ where: { categoryId } });
  await prisma.requirement.create({
    data: { categoryId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${cat.projectId}`);
  return { success: true };
}

export async function updateRequirement(
  id: string,
  data: { title: string; description: string; priority: Priority }
) {
  const req = await prisma.requirement.findUniqueOrThrow({
    where: { id },
    include: { category: true },
  });
  await getProjectWithAuth(req.category.projectId);
  await prisma.requirement.update({ where: { id }, data });
  revalidatePath(`/project/${req.category.projectId}`);
  return { success: true };
}

export async function deleteRequirement(id: string) {
  const req = await prisma.requirement.findUniqueOrThrow({
    where: { id },
    include: { category: true },
  });
  await getProjectWithAuth(req.category.projectId);
  await prisma.nFRMetric.deleteMany({ where: { requirementId: id } });
  await prisma.requirement.delete({ where: { id } });
  revalidatePath(`/project/${req.category.projectId}`);
  return { success: true };
}

// Requirement Categories
export async function addRequirementCategory(
  projectId: string,
  data: { type: RequirementType; name: string }
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.requirementCategory.count({
    where: { projectId, type: data.type },
  });
  await prisma.requirementCategory.create({
    data: { projectId, ...data, sortOrder: count },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function deleteRequirementCategory(id: string) {
  const cat = await prisma.requirementCategory.findUniqueOrThrow({
    where: { id },
  });
  await getProjectWithAuth(cat.projectId);
  // Delete metrics, then requirements, then category
  const reqs = await prisma.requirement.findMany({
    where: { categoryId: id },
    select: { id: true },
  });
  for (const req of reqs) {
    await prisma.nFRMetric.deleteMany({ where: { requirementId: req.id } });
  }
  await prisma.requirement.deleteMany({ where: { categoryId: id } });
  await prisma.requirementCategory.delete({ where: { id } });
  revalidatePath(`/project/${cat.projectId}`);
  return { success: true };
}

// NFR Metrics
export async function addNFRMetric(
  requirementId: string,
  data: { metricName: string; targetValue: string; unit: string }
) {
  const req = await prisma.requirement.findUniqueOrThrow({
    where: { id: requirementId },
    include: { category: true },
  });
  await getProjectWithAuth(req.category.projectId);
  await prisma.nFRMetric.create({
    data: { requirementId, ...data },
  });
  revalidatePath(`/project/${req.category.projectId}`);
  return { success: true };
}

export async function deleteNFRMetric(id: string) {
  const metric = await prisma.nFRMetric.findUniqueOrThrow({
    where: { id },
    include: { requirement: { include: { category: true } } },
  });
  await getProjectWithAuth(metric.requirement.category.projectId);
  await prisma.nFRMetric.delete({ where: { id } });
  revalidatePath(`/project/${metric.requirement.category.projectId}`);
  return { success: true };
}

// Project Meta
export async function updateProjectMeta(
  projectId: string,
  data: Partial<{
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  }>
) {
  await getProjectWithAuth(projectId);
  await prisma.projectMeta.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
