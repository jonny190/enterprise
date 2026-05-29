import { prisma } from "@/lib/prisma";
import type { ApiKeyView } from "./types";

export async function getOrgApiKeys(orgId: string): Promise<ApiKeyView[]> {
  const keys = await prisma.apiKey.findMany({
    where: { orgId },
    include: {
      project: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    projectId: k.projectId,
    projectName: k.project?.name ?? null,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
    createdByName: k.createdBy.name,
  }));
}

/** Non-deleted projects in an org, for the "restrict to project" selector. */
export async function getOrgProjectsForKeys(orgId: string) {
  return prisma.project.findMany({
    where: { orgId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
