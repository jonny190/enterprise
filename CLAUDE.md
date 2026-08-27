# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise Requirements Platform - a multi-tenant web app for gathering project requirements and turning them into AI-assisted outputs. Alongside the original document outputs (coding prompts, requirements docs, project briefs, technical specs) it now covers process flow diagrams, slide decks, requirements scoring, a chat assistant that can edit the project, versioned revisions with diffing, Word/PDF import, and error tracking with GitHub PR creation. Deployed at enterprise.coria.app via Coolify + Cloudflare.

## Commands

```bash
# Development
npm run dev                              # Start Next.js dev server (needs local PostgreSQL)
docker compose up -d                     # Start local PostgreSQL (postgres:16-alpine, port 5432)

# Database
npm run db:generate                      # Generate Prisma client from schema
npm run db:migrate                       # Apply migrations (prisma migrate deploy)
npm run db:studio                        # Open database browser
npx prisma migrate dev                   # Create and apply a new migration in development

# Build & Lint
npm run build                            # Production build (output: standalone)
npm run lint                             # ESLint
npx tsc --noEmit                         # Typecheck
```

No test framework is configured.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Language:** TypeScript (strict mode), path alias `@/*` maps to `./src/*`
- **Database:** PostgreSQL 16 + Prisma 7 (with @prisma/adapter-pg)
- **Auth:** NextAuth.js 4 with credentials provider, JWT sessions
- **UI:** Tailwind CSS 4, shadcn/ui (base-nova style) on @base-ui/react, Lucide icons, Inter via `next/font/google`
- **Toasts:** sonner, mounted once in `src/components/providers.tsx`
- **AI:** Anthropic SDK via Claude Sonnet 5 (`claude-sonnet-5`), streaming on the generation and chat paths
- **Email:** Microsoft Graph API (Azure OAuth2)
- **Drag & Drop:** @dnd-kit
- **Process flows:** @xyflow/react with dagre for auto-layout
- **Slides:** reveal.js, loaded from the CDN for the exported deck and dynamically imported for the in-app preview
- **Import:** mammoth for .docx; PDFs are parsed by Claude directly
- **Brand lookup:** @mendable/firecrawl-js (optional, needs FIRECRAWL_API_KEY)
- **Markdown:** react-markdown with @tailwindcss/typography
- **Export:** docx library (Word), browser print (PDF), client-side (Markdown)

## Architecture

### Route Groups

Two Next.js route groups under `src/app/`:
- `(auth)/` - Public auth pages (login, register, verify-email, forgot-password, reset-password)
- `(dashboard)/` - Protected pages (force-dynamic), includes the org rail sidebar layout

`src/proxy.ts` is the Next.js 16 middleware entry point - it shows up as `ƒ Proxy (Middleware)` in the build output.

### Key URL Patterns

- `/dashboard` - Home, org list
- `/org/[slug]/projects|members|settings` - Organization pages
- `/project/[id]/...` - Project pages. Thirteen sub-pages:
  `wizard`, `meta`, `requirements`, `priorities`, `processes`, `generate`, `outputs`,
  `slides`, `scoring`, `chat`, `errors`, `revisions`, `settings`
- `/project/[id]/revisions/[revisionId]` and `/project/[id]/revisions/compare`

### Modules (`src/modules/`)

Feature code is organised by module, not by layer. Each module owns its own actions, components and lib code:

`auth`, `chat`, `errors`, `generation`, `github`, `import`, `orgs`, `outputs`, `processes`, `projects`, `requirements`, `scoring`, `slides`, `versions`, `wizard`

Prefer changing the relevant module over changing shared platform code in `src/lib/` or `src/components/`.

### Server Actions

Server Actions live in `src/modules/<feature>/actions.ts` (not a top-level `src/actions/`). Most mutations go through them rather than API routes. Each action checks permissions via `requireSession()` and `requireOrgMembership()` from `src/lib/permissions.ts`, and calls `revalidatePath()` afterwards.

When an action mutates a child record, scope the write by parent as well as by id (for example `where: { id, projectId }`). Authorising on a caller-supplied parent id while writing by child id alone is a cross-tenant hole.

### API Routes (`src/app/api/`)

Fifteen route handlers exist. Anything that needs streaming, file upload, or a plain fetch from a client component lives here; everything else is a Server Action.

Auth:
- `auth/[...nextauth]/route.ts` - NextAuth handler

AI-backed:
- `generate/route.ts` - POST, streams document generation
- `generate-flow/route.ts` - POST, generates a process flow diagram
- `generate-stories/route.ts` - POST, generates user stories
- `chat/route.ts` - GET/POST/DELETE, project chat assistant with tool use
- `scoring/route.ts` - GET/POST, requirements quality scoring
- `slides/route.ts` - POST, generates a slide deck
- `brand/route.ts` - POST, scrapes a company site and extracts brand details
- `errors/route.ts` - POST, AI analysis of a logged error

Export and import:
- `export/pdf/route.ts` - POST, returns a print-ready HTML document
- `export/word/route.ts` - POST, returns a .docx
- `import/requirements/route.ts` - POST, .docx/.pdf upload

GitHub and error tracking:
- `github/orgs/route.ts` - GET, lists the user's GitHub orgs
- `errors/create-pr/route.ts` - POST, opens a PR fixing a logged error
- `errors/ingest/route.ts` - POST, **public** endpoint. Authenticated by a per-project `apiKey`, not by session. See `guides/error-ingestion.md`.

### Multi-Tenancy

Organization-scoped with three roles: owner > admin > member. Permission checks in `src/lib/permissions.ts`. Projects belong to organizations. All data access is scoped through org membership.

### AI Generation

Prompts are built per output type in `src/modules/generation/lib/prompts.ts`. Streaming lives in `src/modules/generation/lib/generate.ts`. Generated outputs are stored in the `GeneratedOutput` model with an optional `editedContent` field.

All call sites pin `claude-sonnet-5`. Two things to keep in mind when editing them:

- Thinking is on by default on this model, so the first content block is not guaranteed to be text. Always scan with `content.find((c): c is TextBlock => c.type === "text")` rather than indexing `content[0]`.
- `temperature`, `top_p`, `top_k` and `thinking.budget_tokens` are rejected with a 400 on this model, as are assistant-message prefills.

### Layout Components

- `org-rail.tsx` - Left sidebar with org avatars (Slack-style switcher)
- `project-sidebar.tsx` - Org/project navigation panel
- `project-tabs.tsx` - Tab bar for project sub-pages

### Database

Prisma schema at `prisma/schema.prisma`. Projects use soft-delete (`deletedAt` field). Nested entities cascade on delete. Wizard progress is tracked in `ProjectWizardState` as JSON.

## Deployment

Docker multi-stage build, standalone output copied to a slim runner image. Deployed on Coolify with a Cloudflare proxy for HTTPS, so `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` use `http://`.

**Migrations run at container start, not at build time.** `docker-entrypoint.sh` runs `prisma migrate deploy` from `/app/migrator` before starting the server, under `set -e`. A migration that fails will restart-loop the container rather than fail the build, so check a migration against production data before shipping it.

### Environment variables

Required:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Public URL of the app |
| `NEXTAUTH_SECRET` | JWT signing secret (read by NextAuth itself) |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL`, exposed to the browser |
| `ANTHROPIC_API_KEY` | Claude API key (read by the Anthropic SDK itself) |

Optional:

| Variable | Purpose | Behaviour if unset |
|----------|---------|--------------------|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SENDER_EMAIL` | Microsoft Graph email for invitations and verification | Invite links are shown in the UI instead of emailed |
| `FIRECRAWL_API_KEY` | Brand lookup in org settings | `/api/brand` returns a "not configured" error |
