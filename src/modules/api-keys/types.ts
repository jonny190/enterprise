// A safe, serialisable view of an API key for the management UI.
// The plaintext token is intentionally never part of this shape — it is only
// returned once, inline, from the create action.
export interface ApiKeyView {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  projectId: string | null;
  projectName: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdByName: string;
}
