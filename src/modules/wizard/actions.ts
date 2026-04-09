"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { Priority, FlowType } from "@prisma/client";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });

  await requireOrgMembership(user.id, project.orgId);
  return project;
}

export async function saveProjectMeta(
  projectId: string,
  data: {
    businessContext: string;
    targetUsers: string;
    stakeholders: string;
    timeline: string;
    glossary: string;
    technicalConstraints: string;
    importNotes?: string;
  }
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

export async function saveVisionStatement(
  projectId: string,
  visionStatement: string
) {
  await getProjectWithAuth(projectId);

  await prisma.projectMeta.upsert({
    where: { projectId },
    create: { projectId, visionStatement },
    update: { visionStatement },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveObjectives(
  projectId: string,
  objectives: { id?: string; title: string; successCriteria: string }[]
) {
  await getProjectWithAuth(projectId);

  // Delete existing and recreate (simpler than diffing)
  await prisma.objective.deleteMany({ where: { projectId } });

  await prisma.objective.createMany({
    data: objectives.map((obj, index) => ({
      projectId,
      title: obj.title,
      successCriteria: obj.successCriteria,
      sortOrder: index,
    })),
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveUserStories(
  projectId: string,
  stories: {
    id?: string;
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[]
) {
  await getProjectWithAuth(projectId);

  await prisma.userStory.deleteMany({ where: { projectId } });

  await prisma.userStory.createMany({
    data: stories.map((story, index) => ({
      projectId,
      role: story.role,
      capability: story.capability,
      benefit: story.benefit,
      priority: story.priority,
      sortOrder: index,
    })),
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveNFRs(
  projectId: string,
  categories: {
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: Priority;
      metrics: { metricName: string; targetValue: string; unit: string }[];
    }[];
  }[]
) {
  await getProjectWithAuth(projectId);

  // Delete existing NFR categories and their requirements
  const existingCategories = await prisma.requirementCategory.findMany({
    where: { projectId, type: "non_functional" },
    select: { id: true },
  });

  for (const cat of existingCategories) {
    const reqs = await prisma.requirement.findMany({
      where: { categoryId: cat.id },
      select: { id: true },
    });
    for (const req of reqs) {
      await prisma.nFRMetric.deleteMany({ where: { requirementId: req.id } });
    }
    await prisma.requirement.deleteMany({ where: { categoryId: cat.id } });
  }
  await prisma.requirementCategory.deleteMany({
    where: { projectId, type: "non_functional" },
  });

  // Create new
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const category = await prisma.requirementCategory.create({
      data: {
        projectId,
        type: "non_functional",
        name: cat.name,
        sortOrder: i,
      },
    });

    for (let j = 0; j < cat.requirements.length; j++) {
      const req = cat.requirements[j];
      const requirement = await prisma.requirement.create({
        data: {
          categoryId: category.id,
          title: req.title,
          description: req.description,
          priority: req.priority,
          sortOrder: j,
        },
      });

      if (req.metrics.length > 0) {
        await prisma.nFRMetric.createMany({
          data: req.metrics.map((m) => ({
            requirementId: requirement.id,
            metricName: m.metricName,
            targetValue: m.targetValue,
            unit: m.unit,
          })),
        });
      }
    }
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveConstraints(
  projectId: string,
  items: {
    type: "constraint" | "assumption" | "dependency";
    name: string;
    requirements: { title: string; description: string; priority: Priority }[];
  }[]
) {
  await getProjectWithAuth(projectId);

  // Delete existing constraint/assumption/dependency categories
  const types = ["constraint", "assumption", "dependency"] as const;
  for (const type of types) {
    const cats = await prisma.requirementCategory.findMany({
      where: { projectId, type },
      select: { id: true },
    });
    for (const cat of cats) {
      await prisma.requirement.deleteMany({ where: { categoryId: cat.id } });
    }
    await prisma.requirementCategory.deleteMany({
      where: { projectId, type },
    });
  }

  // Create new
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const category = await prisma.requirementCategory.create({
      data: {
        projectId,
        type: item.type,
        name: item.name,
        sortOrder: i,
      },
    });

    for (let j = 0; j < item.requirements.length; j++) {
      const req = item.requirements[j];
      await prisma.requirement.create({
        data: {
          categoryId: category.id,
          title: req.title,
          description: req.description,
          priority: req.priority,
          sortOrder: j,
        },
      });
    }
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function saveProcessFlows(
  projectId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flows: { name: string; flowType: FlowType; diagramData: any }[]
) {
  await getProjectWithAuth(projectId);

  await prisma.processFlow.deleteMany({ where: { projectId } });

  if (flows.length > 0) {
    await prisma.$transaction(
      flows.map((flow, index) =>
        prisma.processFlow.create({
          data: {
            projectId,
            name: flow.name,
            flowType: flow.flowType,
            diagramData: flow.diagramData,
            sortOrder: index,
          },
        })
      )
    );
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateWizardState(
  projectId: string,
  data: { currentStep: number; completedSteps: number[] }
) {
  await getProjectWithAuth(projectId);

  await prisma.projectWizardState.upsert({
    where: { projectId },
    create: {
      projectId,
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
    },
    update: {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function finalizeWizard(projectId: string) {
  await getProjectWithAuth(projectId);

  await prisma.$transaction([
    prisma.projectWizardState.update({
      where: { projectId },
      data: {
        currentStep: 8,
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { status: "active" },
    }),
  ]);

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
