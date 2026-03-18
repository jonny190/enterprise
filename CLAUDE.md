# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise Requirements Platform - a multi-tenant web app for gathering project requirements and generating AI-assisted outputs (coding prompts, requirements docs, project briefs, technical specs). Deployed at enterprise.coria.app via Coolify + Cloudflare.

## Commands

```bash
# Development
npm run dev                              # Start Next.js dev server (needs local PostgreSQL)
docker compose up -d                     # Start local PostgreSQL (postgres:16-alpine, port 5432)

# Database
npx prisma generate                      # Generate Prisma client from schema
npx prisma migrate dev                   # Create/apply migrations in development
npx prisma migrate deploy                # Apply migrations in production
npx prisma studio                        # Open database browser

# Build & Lint
npm run build                            # Production build (output: standalone)
npm run lint                             # ESLint
```

No test framework is configured.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Language:** TypeScript (strict mode), path alias `@/*` maps to `./src/*`
- **Database:** PostgreSQL 16 + Prisma 7 (with @prisma/adapter-pg)
- **Auth:** NextAuth.js 4 with credentials provider, JWT sessions
- **UI:** Tailwind CSS 4, shadcn/ui (base-nova style), Lucide icons, Geist font
- **AI:** Anthropic SDK streaming via Claude Sonnet 4
- **Email:** Microsoft Graph API (Azure OAuth2)
- **Drag & Drop:** @dnd-kit
- **Export:** docx library (Word), browser print (PDF), client-side (Markdown)

## Architecture

### Route Groups

Two Next.js route groups under `src/app/`:
- `(auth)/` - Public auth pages (login, register, verify-email, forgot-password, reset-password)
- `(dashboard)/` - Protected pages (force-dynamic), includes the org rail sidebar layout

### Key URL Patterns

- `/dashboard` - Home, org list
- `/org/[slug]/projects|members|settings` - Organization pages
- `/project/[id]/wizard|meta|requirements|generate|outputs|settings` - Project pages

### Server Actions (`src/actions/`)

All mutations go through Server Actions, not API routes. Each action checks permissions via `requireSession()` and `requireOrgMembership()` from `src/lib/permissions.ts`. Actions call `revalidatePath()` after mutations.

### API Routes (`src/app/api/`)

Only three API routes exist - all others are Server Actions:
- `auth/[...nextauth]/route.ts` - NextAuth handler
- `generate/route.ts` - POST, streams AI generation via Anthropic SDK
- `export/pdf/route.ts` and `export/word/route.ts` - Document export

### Multi-Tenancy

Organization-scoped with three roles: owner > admin > member. Permission checks in `src/lib/permissions.ts`. Projects belong to organizations. All data access is scoped through org membership.

### AI Generation

Prompts are built in `src/lib/generation/prompts.ts` per output type. Streaming handled in `src/lib/generation/generate.ts`. Generated outputs stored in `GeneratedOutput` model with optional `editedContent` field.

### Layout Components

- `org-rail.tsx` - Left sidebar with org avatars (Slack-style switcher)
- `project-sidebar.tsx` - Org/project navigation panel
- `project-tabs.tsx` - Tab bar for project sub-pages

### Database

Prisma schema at `prisma/schema.prisma`. Projects use soft-delete (`deletedAt` field). Nested entities cascade on delete. Wizard progress tracked in `ProjectWizardState` as JSON.

## Deployment

Docker multi-stage build. Prisma migrations run at build time. Standalone output copied to slim runner image. Deployed on Coolify with Cloudflare proxy for HTTPS.

Environment variables: DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SENDER_EMAIL, ANTHROPIC_API_KEY, NEXT_PUBLIC_APP_URL.
