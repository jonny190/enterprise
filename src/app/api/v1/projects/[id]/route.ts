import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth, requireScope, requireProjectAccess } from "@/lib/api-auth";

// GET /api/v1/projects/:id
// Auth: Authorization: Bearer <api-key>  (or x-api-key: <api-key>)
// Scope: read
//
// Returns the full requirements context for a single project: meta,
// objectives, user stories, requirement categories (with requirements and
// metrics) and process flows. Intended for the agent fleet to load everything
// it needs to reason about a project in one call.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiAuth(req, async (ctx) => {
    requireScope(ctx, "read");
    const { id } = await params;
    await requireProjectAccess(ctx, id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        meta: true,
        objectives: { orderBy: { sortOrder: "asc" } },
        userStories: { orderBy: { sortOrder: "asc" } },
        requirementCategories: {
          include: {
            requirements: {
              include: { metrics: true },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        processFlows: { orderBy: { sortOrder: "asc" } },
      },
    });

    // requireProjectAccess already guaranteed visibility; guard for types.
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return Response.json({
      id: project.id,
      name: project.name,
      description: project.description,
      gitRepo: project.gitRepo,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      meta: project.meta
        ? {
            businessContext: project.meta.businessContext,
            visionStatement: project.meta.visionStatement,
            targetUsers: project.meta.targetUsers,
            technicalConstraints: project.meta.technicalConstraints,
            timeline: project.meta.timeline,
            stakeholders: project.meta.stakeholders,
            glossary: project.meta.glossary,
          }
        : null,
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
    });
  });
}
