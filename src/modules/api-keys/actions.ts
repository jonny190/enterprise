"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  requireOrgMembership,
  canManageOrgSettings,
} from "@/lib/permissions";
import { generateApiKey, isValidScope, API_SCOPES } from "@/lib/api-keys";

export interface CreateApiKeyInput {
  orgId: string;
  name: string;
  scopes: string[];
  /** Optional: restrict the key to a single project in the org. */
  projectId?: string | null;
  /** Optional: days until the key expires. */
  expiresInDays?: number | null;
}

export interface CreateApiKeyResult {
  id: string;
  /** Plaintext token — returned exactly once, never persisted. */
  token: string;
  prefix: string;
}

export async function createApiKey(
  input: CreateApiKeyInput
): Promise<CreateApiKeyResult> {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, input.orgId);
  if (!canManageOrgSettings(membership.role)) {
    throw new Error("Only organization owners can manage API keys");
  }

  const name = input.name?.trim();
  if (!name) throw new Error("A key name is required");

  const scopes = (input.scopes ?? []).filter(isValidScope);
  if (scopes.length === 0) {
    throw new Error(`Select at least one scope (${API_SCOPES.join(", ")})`);
  }

  // If a project restriction is requested, ensure it belongs to this org.
  let projectId: string | null = null;
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, orgId: input.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new Error("Selected project not found in this organization");
    projectId = project.id;
  }

  let expiresAt: Date | null = null;
  if (input.expiresInDays && input.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
  }

  const { token, prefix, hashedKey } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      orgId: input.orgId,
      projectId,
      name,
      prefix,
      hashedKey,
      scopes,
      expiresAt,
      createdById: user.id,
    },
  });

  revalidatePath(`/org/${input.orgId}/settings`);

  return { id: created.id, token, prefix };
}

export async function revokeApiKey(orgId: string, keyId: string) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);
  if (!canManageOrgSettings(membership.role)) {
    throw new Error("Only organization owners can manage API keys");
  }

  // Scope the update by orgId so a key id from another org can't be touched.
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, orgId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) throw new Error("API key not found");

  revalidatePath(`/org/${orgId}/settings`);
}

export async function deleteApiKey(orgId: string, keyId: string) {
  const user = await requireSession();
  const membership = await requireOrgMembership(user.id, orgId);
  if (!canManageOrgSettings(membership.role)) {
    throw new Error("Only organization owners can manage API keys");
  }

  const result = await prisma.apiKey.deleteMany({ where: { id: keyId, orgId } });
  if (result.count === 0) throw new Error("API key not found");

  revalidatePath(`/org/${orgId}/settings`);
}
