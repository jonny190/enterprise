import { prisma } from "@/lib/prisma";

export type VersionSnapshot = {
  gitRepo?: string;
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  };
  objectives: { id: string; title: string; successCriteria: string }[];
  userStories: { id: string; role: string; capability: string; benefit: string; priority: string }[];
  requirementCategories: {
    id: string;
    type: string;
    name: string;
    requirements: {
      id: string;
      title: string;
      description: string;
      priority: string;
      metrics: { id: string; metricName: string; targetValue: string; unit: string }[];
    }[];
  }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processFlows: { id: string; name: string; flowType: string; diagramData: any }[];
};

export async function snapshotProjectState(projectId: string): Promise<VersionSnapshot> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: {
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: {
            orderBy: { sortOrder: "asc" },
            include: { metrics: true },
          },
        },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  return {
    gitRepo: project.gitRepo || undefined,
    meta: {
      visionStatement: project.meta?.visionStatement ?? "",
      businessContext: project.meta?.businessContext ?? "",
      targetUsers: project.meta?.targetUsers ?? "",
      technicalConstraints: project.meta?.technicalConstraints ?? "",
      timeline: project.meta?.timeline ?? "",
      stakeholders: project.meta?.stakeholders ?? "",
      glossary: project.meta?.glossary ?? "",
    },
    objectives: project.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      successCriteria: o.successCriteria,
    })),
    userStories: project.userStories.map((s) => ({
      id: s.id,
      role: s.role,
      capability: s.capability,
      benefit: s.benefit,
      priority: s.priority,
    })),
    requirementCategories: project.requirementCategories.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      requirements: c.requirements.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        metrics: r.metrics.map((m) => ({
          id: m.id,
          metricName: m.metricName,
          targetValue: m.targetValue,
          unit: m.unit,
        })),
      })),
    })),
    processFlows: project.processFlows.map((f) => ({
      id: f.id,
      name: f.name,
      flowType: f.flowType,
      diagramData: f.diagramData,
    })),
  };
}
