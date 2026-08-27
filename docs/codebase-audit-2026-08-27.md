# Codebase audit, August 2026

A full sweep of the codebase for dead code, dependency drift, stale documentation, schema problems and API drift. Seventy six candidate findings were raised and each was independently re-checked before being accepted; seven were thrown out as either taste or factually wrong.

This document records what was left undone and why. What was fixed is in the git history.

## Fixed

Security:

- `GET /api/scoring` returned any project's scoring history to any logged in user. It never checked org membership, although the `POST` on the same route always had.
- The process flow actions authorised against a caller supplied `projectId` but then mutated by flow `id` alone, so a caller could pass their own project and another org's flow. All four mutations are now scoped by both.

Bugs:

- The Toaster was never mounted anywhere, so all twenty one `toast()` calls across seven components were silent. On several paths, including failed PR creation and failed version creation, that toast was the only error message the user would ever have seen.
- Saved outputs downloaded the PDF endpoint's response as `.pdf`, but that endpoint returns print ready HTML, so the file would not open.
- Both export routes interpolated a client supplied filename into HTML and into the `Content-Disposition` header with no escaping.
- Three AI routes swallowed every error with a bare `catch`, so production failures were invisible.
- The chat route called the Anthropic API with no error handling at all, so any API failure became an unlogged 500.

Updates:

- All nine Anthropic call sites moved from `claude-sonnet-4-20250514` to `claude-sonnet-5`.
- Document generation was truncating at 8192 output tokens; the ceiling is now 32000.
- Removed dead code, deduplicated three copies of `parseGitHubRepo` and six copies of the download idiom, dropped four unused dependencies, and brought the documentation back in line with the code.

## Not done, and why

### Database schema

Six findings involve schema changes. None were applied. Migrations run at container start under `set -e`, so a migration that fails on production data restart loops the container rather than failing a build. Each of these needs a query against production first.

The one worth doing soon:

**`Project.apiKey` has no unique constraint and no index.** It is the sole credential for the public `/api/errors/ingest` endpoint and is resolved with `findFirst`, so every ingest call is a sequential scan of the projects table, and nothing at the database level prevents two projects sharing a key. Before adding a unique index, check for existing duplicates.

The others, in rough priority order:

- Ten foreign key columns used in hot filter and cascade paths have no index. Postgres does not create these automatically and Prisma does not add them.
- `User.verificationToken` and `User.resetToken` are looked up with `findFirst` and have neither a unique constraint nor an index, so every email verification and password reset scans the user table.
- A hand written migration gave `Project.apiKey` a database level default that the schema does not declare. Correcting it needs a new migration; editing the applied one changes its checksum and fails `migrate deploy`.
- The `ErrorLog` index covers `projectId` but not the `createdAt` ordering the errors page always applies.
- `ChatMessage.role`, `ErrorNote.type` and `ErrorPR.type` are free text `String` columns where the TypeScript side already has a closed union. Converting them to enums is worthwhile but Prisma's generated migration for `String` to enum drops and recreates the column, destroying data, so it has to be hand written.

### Unbuilt features, not dead code

Six server actions have no callers. They were read carefully and they are not leftovers from deleted features; they are scaffolding for features that were never finished. Deleting them is a product decision, so they were left alone:

| Action | What it would enable |
|--------|----------------------|
| `updateOutputContent` | Editing a saved output. `OutputItem` still takes the `id` prop it was meant to use, which is the remaining lint warning. |
| `deleteVersion` | Deleting the most recent version. It already enforces that safety rule. |
| `updateProcessFlow` | Renaming a flow or changing its type after creation. |
| `reorderProcessFlows` | Drag to reorder. `flow-list.tsx` already renders an inert drag handle, so the UI currently advertises this. |
| `addNFRMetric` / `deleteNFRMetric` | Per metric editing on the requirements page. Today the wizard's delete all and recreate is the only way to touch NFR metrics. |

Either wire them up or delete them, but the two process flow actions should be handled together, as should the two NFR ones. Note that all four process flow mutations were scoped against cross tenant access in this pass, including the two that are currently unreachable.

For contrast, three genuinely dead things were deleted: `acceptInvitation`, superseded by the inline path in `auth/actions.ts`; `getUserOrgs`, superseded by an inline dashboard query; and `generateOutputFromPrompt`, whose only caller went away with the changelog feature.

### Behaviour changing refactors

**GitHub API calls are unauthenticated.** `fetchRepoContext` and `fetchLatestCommit` send no token even though the org's `githubToken` is stored and used elsewhere, so both silently fail for private repositories. The fix is not just threading the token through: the in memory cache in `repo-context.ts` is keyed on `owner/repo` and shared across tenants, so the token has to be part of the cache key or a silent degradation becomes a cross tenant disclosure.

**`callWithRetry` is copy pasted into three modules** and only retries 529 and 503, missing 429, which is the failure mode that actually shows up under load. Five other call sites have no retry at all. Worth consolidating, but note two traps found during review: the copy wrapping `client.messages.stream()` can never fire, because `stream()` returns immediately and surfaces failures during iteration; and stacking a manual retry on top of the SDK's own retries multiplies the request count.

**Nothing checks `stop_reason`.** Every JSON producing call site takes the text and parses it, so a response truncated at `max_tokens` is treated as complete. Adding the check turns silent truncation into visible failures, which is correct but will surface errors that are currently invisible.

**Five separate functions serialize a project into near identical markdown**, on the chat, slides, scoring and generation paths. Unifying them rewrites the prompt text on all four, with no test framework to catch drift, and would make historical scoring rows non comparable.

**Chat resends unbounded history** plus the full project context on every turn, with no prompt caching. Capping the history is a hard forget with no summarisation behind it, so it changes what the assistant remembers.

### Left alone deliberately

- The `reveal.js` npm package is dynamically imported by the slide preview, so it is not unused. Its stylesheets were pinned to a different major than the installed package; the preview now matches. The exported deck loads all three files from the CDN at 5.1.0 and is internally consistent, so it was not touched.
- `parseGitHubRepo`'s pattern stops the repository name at a dot. That is what strips `.git` from SSH URLs, and widening it would change which repositories resolve, quietly activating the error to PR path for projects where it currently no ops. It was deduplicated verbatim rather than improved.
- The `shadcn` CLI in `dependencies` and the build time CSS plugins were both flagged and both rejected on review: the multi stage Dockerfile means they cost nothing in the runtime image.

## Verification

Every change in this pass was checked with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a full `docker build`. Lint warnings went from six to two, and both remaining ones belong to the unbuilt features above.

The model migration is the one thing not verified against the live API, because no `ANTHROPIC_API_KEY` was available in the environment where this ran. It is worth smoke testing the generate, chat and brand paths after deploy. The brand route is the one to watch: it was the only call site that indexed `content[0]` directly, and since thinking is on by default on Sonnet 5 the first block is no longer guaranteed to be text. That was fixed in the same pass, but it is the one place where the migration would have failed on every request.
