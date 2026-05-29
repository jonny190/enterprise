import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth, requireScope, requireProjectAccess } from "@/lib/api-auth";
import { DeploymentStatus } from "@prisma/client";

const VALID_STATUSES = Object.values(DeploymentStatus) as string[];

function serialize(d: {
  id: string;
  status: string;
  environment: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  url: string;
  logUrl: string;
  source: string;
  message: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: d.id,
    status: d.status,
    environment: d.environment,
    commitSha: d.commitSha,
    commitMessage: d.commitMessage,
    branch: d.branch,
    url: d.url,
    logUrl: d.logUrl,
    source: d.source,
    message: d.message,
    startedAt: d.startedAt?.toISOString() ?? null,
    finishedAt: d.finishedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

// GET /api/v1/projects/:id/deployments
// Scope: read
// Returns the most recent deployments for the project (newest first).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiAuth(req, async (ctx) => {
    requireScope(ctx, "read");
    const { id } = await params;
    await requireProjectAccess(ctx, id);

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

    const deployments = await prisma.deployment.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return Response.json({
      projectId: id,
      deployments: deployments.map(serialize),
    });
  });
}

interface DeploymentBody {
  status?: string;
  environment?: string;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  url?: string;
  logUrl?: string;
  source?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

// POST /api/v1/projects/:id/deployments
// Scope: deploy
// Records a new build/deploy event reported by the agent fleet.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiAuth(req, async (ctx) => {
    requireScope(ctx, "deploy");
    const { id } = await params;
    await requireProjectAccess(ctx, id);

    let body: DeploymentBody;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return Response.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const parseDate = (v: string | undefined): Date | null => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const deployment = await prisma.deployment.create({
      data: {
        projectId: id,
        apiKeyId: ctx.apiKey.id,
        status: (body.status as DeploymentStatus) ?? DeploymentStatus.pending,
        environment: (body.environment || "production").slice(0, 100),
        commitSha: (body.commitSha || "").slice(0, 100),
        commitMessage: (body.commitMessage || "").slice(0, 1000),
        branch: (body.branch || "").slice(0, 200),
        url: (body.url || "").slice(0, 1000),
        logUrl: (body.logUrl || "").slice(0, 1000),
        source: (body.source || "api").slice(0, 200),
        message: (body.message || "").slice(0, 2000),
        startedAt: parseDate(body.startedAt),
        finishedAt: parseDate(body.finishedAt),
      },
    });

    return Response.json(serialize(deployment), { status: 201 });
  });
}
