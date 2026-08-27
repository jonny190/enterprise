# Enterprise Requirements Platform

A multi-tenant web app for gathering project requirements and turning them into AI-assisted outputs. Built with Next.js 16, Prisma, PostgreSQL, and Claude.

What it does:

- A guided wizard that walks a project from vision through objectives, user stories, non-functional requirements and constraints
- Generated documents: coding prompts, requirements docs, project briefs and technical specs
- Process flow diagrams, editable on a canvas or generated from a description
- Slide decks built from the project
- Requirements scoring that flags gaps, vague wording and conflicts
- A chat assistant that can add objectives, stories and requirements directly
- Versioned revisions with side by side diffing
- Word and PDF import to seed a project from an existing document
- Error tracking, with AI analysis and one click pull requests against a linked GitHub repository

## Fork & Deploy (Coolify)

The fastest way to run your own instance:

1. **Fork this repo** to your GitHub account.
2. In Coolify, create a new **Application** resource pointing at your fork.
3. Provision a **PostgreSQL 16** database in the same Coolify project.
4. Set the environment variables below.
5. Deploy.

Full step-by-step walkthrough: [`guides/coolify-deployment.md`](guides/coolify-deployment.md).

## Environment Variables

Copy [`.env.example`](.env.example) to `.env.local` for local dev, or set these in Coolify's **Environment Variables** tab for production.

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/enterprise`) |
| `NEXTAUTH_URL` | Public URL of the app (use `http://` behind Cloudflare, `https://` otherwise) |
| `NEXTAUTH_SECRET` | JWT signing secret. Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL`, exposed to the browser |
| `ANTHROPIC_API_KEY` | Claude API key for AI generation |

### Required for email (registration, invites, password resets)

| Variable | Purpose |
|----------|---------|
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | Azure AD app registration client ID |
| `AZURE_CLIENT_SECRET` | Azure AD app registration secret |
| `AZURE_SENDER_EMAIL` | Mailbox to send from (must exist in the tenant) |

The Azure app needs `Mail.Send` permission with admin consent. Without these, the app still works: invitations show a copyable link in the UI instead of being emailed.

### Optional

| Variable | Purpose |
|----------|---------|
| `FIRECRAWL_API_KEY` | Brand lookup in organization settings. Without it, `/api/brand` returns a "not configured" error and you fill the brand fields in by hand. |

## Local Development

You need Node 20+ and Docker (for the local database).

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL locally
docker compose up -d

# 3. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local - at minimum set NEXTAUTH_SECRET and ANTHROPIC_API_KEY

# 4. Apply migrations
npx prisma migrate deploy

# 5. Start the dev server
npm run dev
```

The app runs at http://localhost:3000.

Handy commands:

```bash
npx prisma studio          # Browse the database
npx prisma migrate dev     # Create a new migration after schema changes
npm run build              # Production build
npm run lint               # ESLint
```

## Architecture

- **Framework:** Next.js 16 App Router with Server Components and Server Actions
- **Database:** PostgreSQL 16 + Prisma 7
- **Auth:** NextAuth.js 4 (credentials provider, JWT sessions)
- **AI:** Anthropic SDK streaming (Claude Sonnet 5)
- **Email:** Microsoft Graph API
- **UI:** Tailwind CSS 4 + shadcn/ui + Lucide

Multi-tenant: data is scoped to organizations with owner/admin/member roles. See [`CLAUDE.md`](CLAUDE.md) for a deeper architectural overview.

## Project Structure

```
src/
  app/                      Next.js routes (auth + dashboard route groups)
  modules/                  Feature modules (projects, requirements, wizard, ...)
  lib/                      Shared utilities (auth, permissions, email, downloads)
  components/               Shared UI components
prisma/
  schema.prisma             Database schema
  migrations/               Migration history (run automatically on deploy)
docs/                       Design specs and plans
guides/                     Operational guides (deployment, etc.)
```

## Deployment Notes

- Migrations run automatically on every container start via the Dockerfile entrypoint - you don't need to run them manually.
- The Dockerfile produces a Next.js standalone build, so the runtime image is ~200MB.
- Cloudflare is the recommended TLS terminator. The app itself runs plain HTTP inside Coolify.

## Troubleshooting

See the [Coolify deployment guide](guides/coolify-deployment.md#troubleshooting) for common deployment issues. For local dev:

- **"Cannot find module '@prisma/client'"** - run `npx prisma generate`.
- **Migrations fail locally** - check Docker is running and `DATABASE_URL` points to `localhost:5432`.
- **Registration throws "Azure Graph API credentials not configured"** - fill in the four `AZURE_*` vars, or temporarily stub them out in `src/lib/email.ts` if you just want to test the UI.
