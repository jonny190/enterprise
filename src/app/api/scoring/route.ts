import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import {
  runStructuralChecks,
  calculateStructuralScore,
  runAIAnalysis,
  buildProjectSummaryForAnalysis,
} from "@/modules/scoring/analyze";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await req.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: { orderBy: { sortOrder: "asc" } },
        },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const meta = project.meta ?? {
    visionStatement: "",
    businessContext: "",
    targetUsers: "",
    technicalConstraints: "",
    timeline: "",
    stakeholders: "",
  };

  const structuralChecks = runStructuralChecks({
    meta,
    objectives: project.objectives,
    userStories: project.userStories,
    requirementCategories: project.requirementCategories,
    processFlows: project.processFlows,
  });

  const structuralScore = calculateStructuralScore(structuralChecks);

  const summary = buildProjectSummaryForAnalysis({
    name: project.name,
    description: project.description,
    meta,
    objectives: project.objectives,
    userStories: project.userStories,
    requirementCategories: project.requirementCategories,
  });

  const aiInsights = await runAIAnalysis(summary);

  return Response.json({
    overallScore: structuralScore,
    structuralChecks,
    aiInsights,
  });
}
