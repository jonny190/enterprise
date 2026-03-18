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

// GET: Load scoring history for a project
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return Response.json({ error: "Missing projectId" }, { status: 400 });
  }

  const results = await prisma.scoringResult.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
    take: 20,
  });

  return Response.json({ results });
}

// POST: Run analysis, save result, return it
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

  const overallScore = calculateStructuralScore(structuralChecks);

  const summary = buildProjectSummaryForAnalysis({
    name: project.name,
    description: project.description,
    meta,
    objectives: project.objectives,
    userStories: project.userStories,
    requirementCategories: project.requirementCategories,
  });

  const aiInsights = await runAIAnalysis(summary);

  // Save to database
  const saved = await prisma.scoringResult.create({
    data: {
      projectId,
      userId: session.user.id,
      overallScore,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      structuralChecks: structuralChecks as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiInsights: aiInsights as any,
    },
  });

  return Response.json({
    id: saved.id,
    overallScore,
    structuralChecks,
    aiInsights,
    createdAt: saved.createdAt.toISOString(),
  });
}
