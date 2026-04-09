"use server";

import { prisma } from "@/lib/prisma";
import {
  requireSession,
  requireOrgMembership,
  canArchiveProject,
  canDeleteProject,
} from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createGithubRepo } from "@/modules/github/lib/create-repo";

export async function createProject(
  orgId: string,
  data: { name: string; description?: string; repoName?: string }
): Promise<{ success: true; projectId: string; repoWarning?: string } | { error: string; success?: never; projectId?: never }> {
  try {
    const user = await requireSession();
    await requireOrgMembership(user.id, orgId);

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });

    const project = await prisma.project.create({
      data: {
        orgId,
        name: data.name,
        description: data.description || "",
        createdById: user.id,
        meta: { create: {} },
        wizardState: { create: {} },
      },
    });

    let repoWarning: string | undefined;

    if (data.repoName && org.githubToken) {
      const isPrivate = org.githubRepoVisibility !== "public";
      const result = await createGithubRepo(org.githubToken, data.repoName, isPrivate);

      if ("url" in result) {
        await prisma.project.update({
          where: { id: project.id },
          data: { gitRepo: result.url },
        });
      } else {
        repoWarning = result.error;
      }
    }

    revalidatePath(`/org/${org.slug}/projects`);
    return { success: true, projectId: project.id, repoWarning };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create project";
    return { error: message };
  }
}

export async function updateProjectGitRepo(projectId: string, gitRepo: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);

  await prisma.project.update({
    where: { id: projectId },
    data: { gitRepo: gitRepo.trim() },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function archiveProject(projectId: string) {
  const user = await requireSession();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });

  const membership = await requireOrgMembership(user.id, project.orgId);

  const isProjectOwner = project.createdById === user.id;

  if (!isProjectOwner && !canArchiveProject(membership.role)) {
    return { error: "You do not have permission to archive this project" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: project.status === "archived" ? "active" : "archived",
    },
  });

  revalidatePath(`/org/${project.org.slug}/projects`);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const user = await requireSession();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });

  const membership = await requireOrgMembership(user.id, project.orgId);

  if (!canDeleteProject(membership.role)) {
    return { error: "Only organization owners can delete projects" };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/org/${project.org.slug}/projects`);
  return { success: true };
}
