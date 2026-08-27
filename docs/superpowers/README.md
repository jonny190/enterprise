# Design history

These are the plans and specs that were written before each feature was built. They are kept as a record of what was intended and why, not as a description of how the code looks now.

**Do not implement anything in this directory.** Every plan here has already shipped. Several still carry a "REQUIRED: use superpowers to implement this plan" directive at the top, which was accurate when the plan was written and is not accurate now. Following one of them would mean rebuilding a feature that already exists.

They also predate the modular restructure, so most of them reference paths that no longer exist:

| Path in the old docs | Where it lives now |
|----------------------|--------------------|
| `src/actions/<feature>.ts` | `src/modules/<feature>/actions.ts` |
| `src/lib/generation/` | `src/modules/generation/lib/` |
| `src/components/<feature>/` | `src/modules/<feature>/components/` |

For how the code is actually laid out today, read [`CLAUDE.md`](../../CLAUDE.md).

## Plans

| Date | Plan | Status |
|------|------|--------|
| 2026-03-16 | [Enterprise Requirements Platform](plans/2026-03-16-enterprise-requirements-platform.md) | Shipped |
| 2026-03-16 | [Enterprise Requirements Platform, detailed](plans/2026-03-16-enterprise-requirements-platform-implementation-plan.md) | Shipped |
| 2026-03-17 | [Process Flow Designer](plans/2026-03-17-process-flow-designer.md) | Shipped |
| 2026-03-17 | [Project Revisions](plans/2026-03-17-project-revisions.md) | Shipped, later replaced by version snapshots |
| 2026-03-18 | [Modular Restructure](plans/2026-03-18-modular-restructure.md) | Shipped. This is the change that moved everything into `src/modules/` |
| 2026-03-18 | [Version Snapshots](plans/2026-03-18-version-snapshots.md) | Shipped |
| 2026-04-09 | [Word/PDF Import](plans/2026-04-09-word-pdf-import.md) | Shipped |

## Specs

| Date | Spec | Status |
|------|------|--------|
| 2026-03-16 | [Enterprise Requirements Platform](specs/2026-03-16-enterprise-requirements-platform-design.md) | Shipped |
| 2026-03-17 | [Process Flow Designer](specs/2026-03-17-process-flow-designer-design.md) | Shipped |
| 2026-03-17 | [Project Revisions](specs/2026-03-17-project-revisions-design.md) | Shipped, later replaced by version snapshots |
| 2026-03-26 | [Word/PDF Import](specs/2026-03-26-word-pdf-import-design.md) | Shipped |

## Features with no design doc

Some later work went straight to code and has no plan in here. Read the modules directly for chat (`src/modules/chat`), scoring (`src/modules/scoring`), slides (`src/modules/slides`), error tracking (`src/modules/errors`) and GitHub repo creation (`src/modules/github`).
