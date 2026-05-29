# Agent API & API Keys

Programmatic access for the agent fleet and external integrations is gated by
**organization API keys**.

## Managing keys

Org **owners** manage keys at **Org Settings → API Keys**. You can:

- Create a key with a name and one or more **scopes**.
- Optionally restrict a key to a **single project** in the org.
- Optionally set an **expiry** (in days).
- **Revoke** (disable but keep the record) or **delete** a key.

The full key is shown **once** at creation time. Only a SHA-256 hash is stored,
so it cannot be recovered later — store it somewhere safe (e.g. the fleet's
secret store).

Key format: `ent_live_<random>`.

## Scopes

| Scope    | Grants                                                        |
| -------- | ------------------------------------------------------------ |
| `read`   | Read project/org context (GET endpoints).                    |
| `write`  | Create/update resources (e.g. report deploy status).         |
| `deploy` | Deploy-related actions reserved for the agent fleet.         |

## Authenticating requests

Send the key as a bearer token (preferred) or via `x-api-key`:

```bash
curl https://enterprise.coria.app/api/v1/projects \
  -H "Authorization: Bearer ent_live_xxxxxxxx"

# equivalent
curl https://enterprise.coria.app/api/v1/projects \
  -H "x-api-key: ent_live_xxxxxxxx"
```

## Example endpoint

`GET /api/v1/projects` — scope: `read`.

Returns the projects the key can access. Org-scoped keys see all non-deleted
projects in the org; project-scoped keys see only their project.

```json
{
  "orgId": "…",
  "scopes": ["read", "deploy"],
  "projects": [
    {
      "id": "…",
      "name": "Acme Portal",
      "description": "",
      "gitRepo": "https://github.com/acme/portal",
      "status": "active",
      "updatedAt": "2026-05-29T12:00:00.000Z"
    }
  ]
}
```

## Implementation notes

- Key generation/hashing: `src/lib/api-keys.ts`
- Request authentication + scope checks: `src/lib/api-auth.ts`
  (`authenticateApiKey`, `requireScope`, `withApiAuth`)
- Management actions/queries: `src/modules/api-keys/`
- Data model: `ApiKey` in `prisma/schema.prisma`

To protect a new route, wrap the handler:

```ts
import { withApiAuth, requireScope } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  return withApiAuth(req, async (ctx) => {
    requireScope(ctx, "write");
    // ctx.orgId, ctx.projectId, ctx.scopes available here
    return Response.json({ ok: true });
  });
}
```
