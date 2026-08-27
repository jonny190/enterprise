import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth, requireScope } from "@/lib/api-auth";

// GET /api/v1/projects
// Auth: Authorization: Bearer <api-key>  (or x-api-key: <api-key>)
// Scope: read
//
// Returns the projects accessible to the key. Org-scoped keys see every
// non-deleted project in the org; project-scoped keys see only their project.
export async function GET(req: NextRequest) {
  return withApiAuth(req, async (ctx) => {
    requireScope(ctx, "read");

    const projects = await prisma.project.findMany({
      where: {
        orgId: ctx.orgId,
        deletedAt: null,
        ...(ctx.projectId ? { id: ctx.projectId } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        gitRepo: true,
        status: true,
        updatedAt: true,
        lockedAt: true,
        buildReadyRevisionId: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return Response.json({
      orgId: ctx.orgId,
      scopes: ctx.scopes,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        gitRepo: p.gitRepo,
        status: p.status,
        updatedAt: p.updatedAt.toISOString(),
        // Build gating: the fleet should only build versions the user has
        // marked ready. `readyToBuild` is true when the project is locked.
        readyToBuild: p.lockedAt !== null,
        lockedAt: p.lockedAt?.toISOString() ?? null,
        buildReadyRevisionId: p.buildReadyRevisionId,
      })),
    });
  });
}
