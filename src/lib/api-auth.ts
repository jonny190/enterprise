import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey, ApiScope } from "@/lib/api-keys";
import type { ApiKey } from "@prisma/client";

export interface ApiAuthContext {
  apiKey: ApiKey;
  orgId: string;
  /** Set when the key is restricted to a single project. */
  projectId: string | null;
  scopes: string[];
}

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Extract the bearer token from either `Authorization: Bearer <token>` or the
 * legacy `x-api-key` header.
 */
function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const headerKey = req.headers.get("x-api-key");
  return headerKey?.trim() || null;
}

/**
 * Authenticate a request using an org API key. Throws {@link ApiAuthError} on
 * any failure. On success, records `lastUsedAt` and returns the auth context.
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<ApiAuthContext> {
  const token = extractToken(req);
  if (!token) {
    throw new ApiAuthError(
      "Missing API key (use Authorization: Bearer <key> or x-api-key)",
      401
    );
  }

  const hashedKey = hashApiKey(token);
  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey } });

  if (!apiKey) {
    throw new ApiAuthError("Invalid API key", 401);
  }
  if (apiKey.revokedAt) {
    throw new ApiAuthError("API key has been revoked", 401);
  }
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    throw new ApiAuthError("API key has expired", 401);
  }

  // Best-effort usage tracking; never block the request on this.
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    apiKey,
    orgId: apiKey.orgId,
    projectId: apiKey.projectId,
    scopes: apiKey.scopes,
  };
}

/** Throw unless the authenticated key carries the required scope. */
export function requireScope(ctx: ApiAuthContext, scope: ApiScope): void {
  if (!ctx.scopes.includes(scope)) {
    throw new ApiAuthError(`API key is missing required scope: ${scope}`, 403);
  }
}

/**
 * Resolve a project the key is allowed to access, or throw 404. Enforces both
 * org scoping and the optional single-project restriction on the key. Returns
 * 404 (not 403) for projects outside the key's reach so existence isn't leaked.
 */
export async function requireProjectAccess(
  ctx: ApiAuthContext,
  projectId: string
) {
  if (ctx.projectId && ctx.projectId !== projectId) {
    throw new ApiAuthError("Project not found", 404);
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId, deletedAt: null },
  });
  if (!project) {
    throw new ApiAuthError("Project not found", 404);
  }
  return project;
}

/**
 * Convenience wrapper: run an authenticated handler and convert any
 * {@link ApiAuthError} into a JSON error response.
 */
export async function withApiAuth(
  req: NextRequest,
  handler: (ctx: ApiAuthContext) => Promise<Response>
): Promise<Response> {
  try {
    const ctx = await authenticateApiKey(req);
    return await handler(ctx);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
