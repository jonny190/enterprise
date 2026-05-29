import { createHash, randomBytes, timingSafeEqual } from "crypto";

// Recognised scopes for programmatic API keys.
//  - read:   read project/org context (GET endpoints)
//  - write:  create/update resources (e.g. report deploy status, push errors)
//  - deploy: trigger deploy-related actions reserved for the agent fleet
export const API_SCOPES = ["read", "write", "deploy"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export function isValidScope(scope: string): scope is ApiScope {
  return (API_SCOPES as readonly string[]).includes(scope);
}

const KEY_PREFIX = "ent";
// Number of characters of the random body kept (in plaintext) for display.
const DISPLAY_CHARS = 6;

export interface GeneratedKey {
  /** Full plaintext token — shown to the user exactly once. */
  token: string;
  /** Non-secret identifier stored for display, e.g. "ent_live_a1b2c3…". */
  prefix: string;
  /** SHA-256 hex digest persisted in the database. */
  hashedKey: string;
}

/**
 * Generate a new API key. The plaintext `token` is returned to the caller and
 * must never be stored; only `hashedKey` is persisted.
 */
export function generateApiKey(): GeneratedKey {
  const body = randomBytes(32).toString("base64url");
  const token = `${KEY_PREFIX}_live_${body}`;
  return {
    token,
    prefix: `${KEY_PREFIX}_live_${body.slice(0, DISPLAY_CHARS)}`,
    hashedKey: hashApiKey(token),
  };
}

/** Deterministic SHA-256 hash used for storage and lookup. */
export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
