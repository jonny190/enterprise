# Project Revisions - Design Specification

## Overview

Add the ability to create revisions against existing projects, capturing additions, modifications, and removals to requirements over time. Revisions form a linear chain where each builds on the previous, and the cumulative project state can be viewed at any point. A dedicated revision editor shows the current state with inline change controls. AI generation supports both full updated specs and changes-only documents.

## Requirements Summary

- **Manually initiated** revisions, layered on top of the project baseline
- **Linear chain** -- Rev 1, Rev 2, etc. Each revision's baseline is the original project + all prior finalized revisions
- **Cumulative view** at any revision point
- **Full scope** -- can change objectives, user stories, NFRs, constraints, meta, process flows, and add entirely new items
- **Dedicated revision editor** showing current state with inline add/modify/remove controls
- **Simple change tags** -- added, modified, removed (no justification field required)
- **AI generation** -- full updated spec from resolved state, or changes-only changelog document
- **Original data is never mutated** -- revisions are an overlay

## Data Model

### New Enums

```prisma
enum RevisionStatus {
  draft
  finalized
}

enum ChangeType {
  added
  modified
  removed
}

enum TargetType {
  objective
  user_story
  requirement
  requirement_category
  nfr_metric
  process_flow
  project_meta
}
```

### New Model: Revision

```prisma
model Revision {
  id              String         @id @default(uuid())
  projectId       String
  revisionNumber  Int
  title           String
  description     String         @default("")
  status          RevisionStatus @default(draft)
  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  project   Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy User             @relation("RevisionCreatedBy", fields: [createdById], references: [id])
  changes   RevisionChange[]

  @@unique([projectId, revisionNumber])
}
```

### New Model: RevisionChange

```prisma
model RevisionChange {
  id         String     @id @default(uuid())
  revisionId String
  changeType ChangeType
  targetType TargetType
  targetId   String?
  data       Json       @default("{}")
  sortOrder  Int        @default(autoincrement())
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  revision Revision @relation(fields: [revisionId], references: [id], onDelete: Cascade)

  @@index([revisionId])
}
```

The `Project` model gains a `revisions Revision[]` relation. The `User` model gains a `revisionsCreated Revision[] @relation("RevisionCreatedBy")` relation.

### How change data is structured

**Added items** -- `targetId` is null, `data` contains the full item with a synthetic `id` (UUID generated at creation time, used for cross-referencing within the same revision):
- Objective: `{ id, title, successCriteria }`
- UserStory: `{ id, role, capability, benefit, priority }`
- RequirementCategory: `{ id, type, name }`
- Requirement: `{ id, categoryId, title, description, priority }` -- `categoryId` may reference an existing category ID or the synthetic `id` from another `added` category change in the same or prior revision
- NFRMetric: `{ id, requirementId, metricName, targetValue, unit }` -- `requirementId` may reference an existing requirement or a synthetic ID from an `added` requirement change
- ProcessFlow: `{ id, name, flowType, diagramData }`
- ProjectMeta: N/A for added (ProjectMeta is a singleton, always use `modified`)

**Modified items** -- `targetId` references the existing item, `data` contains only the changed fields (same shape as added, but partial). For requirements that include metric changes, include a `metrics` array in the data with the full updated set of metrics for that requirement.

**Removed items** -- `targetId` references the existing item, `data` is empty `{}`.

**ProjectMeta changes** -- `targetType: project_meta`, `targetId` is the ProjectMeta record ID. `data` contains one or more field/value pairs: `{ visionStatement: "new value", businessContext: "new value" }`. Multiple fields can be changed in a single change record since ProjectMeta is a singleton.

## Revision Management UI

### Revisions Tab

New project tab at `/project/[id]/revisions`, positioned between Processes and Generate.

**Revisions list page:**
- All revisions displayed in order as cards
- Each card: revision number, title, status badge (draft/finalized), change count, created by, date
- "New Revision" button creates a draft with the next sequential number
- Only one draft revision allowed at a time per project
- Click a revision to open the revision editor
- Finalized revisions open in read-only mode

**Server actions (src/actions/revisions.ts):**
- `createRevision(projectId, title)` -- creates a draft with next revision number
- `updateRevision(id, data)` -- update title, description
- `finalizeRevision(id)` -- set status to finalized, locks changes
- `deleteRevision(id)` -- only allowed for draft revisions
- `addChange(revisionId, changeType, targetType, targetId, data)` -- add a change record
- `updateChange(id, data)` -- modify a change record's data
- `deleteChange(id)` -- remove a change record (undo a change)

All actions check permissions via `requireSession()` and `requireOrgMembership()`.

## Revision Editor

The revision editor at `/project/[id]/revisions/[revisionId]` shows the cumulative project state and lets users make changes inline.

### Layout

- **Top bar:** revision title (editable for drafts), status badge, "Finalize" button
- **Below:** tabbed interface with tabs for Vision, Objectives, User Stories, NFRs, Constraints, Process Flows, Meta

### Change interactions

- Each existing item displays with its current content (baseline + prior revisions applied)
- Hover/select reveals "Modify" and "Remove" action buttons
- **Modify:** opens item inline for editing. Saving creates a `modified` RevisionChange
- **Remove:** marks item with strikethrough and red "Removed" badge. Creates a `removed` RevisionChange
- **Add:** button at bottom of each section. Creates an `added` RevisionChange with new item data
- **Undo:** clicking a change badge on a current-revision change deletes the RevisionChange and restores original view

### Visual indicators

- **Current revision changes:** green "Added" badge, amber "Modified" badge, red "Removed" badge
- **Prior revision changes:** subtle revision number indicator, displayed as normal current-state items
- **Finalized revisions:** read-only view, all changes shown with badges but not editable

## Cumulative State Resolver

A server-side utility at `src/lib/revisions.ts` that computes project state at any revision.

### Interface

```typescript
function resolveProjectState(
  projectId: string,
  revisionNumber?: number | null,
  includeDraftId?: string | null
): Promise<ResolvedProjectState>
```

The optional `includeDraftId` parameter allows the revision editor to include a draft revision's changes on top of the finalized chain. This is used only by the editor UI -- AI generation and exports always use finalized revisions only.

### Algorithm

1. Fetch baseline project data (objectives, stories, requirements with categories and metrics, flows, meta)
2. If `revisionNumber` is null and `includeDraftId` is null, return baseline as-is
3. Fetch all finalized revisions up to `revisionNumber`, ordered by revision number. If `includeDraftId` is provided, also fetch that draft revision and append it to the list
4. For each revision, apply changes sequentially (ordered by `sortOrder` within each revision):
   - `added`: insert new item with a generated ID into the collection
   - `modified`: merge updated fields into the matching item (by targetId)
   - `removed`: remove item from the collection
5. Return resolved state in the same shape as baseline data, plus annotations for each item indicating which revision last changed it and how

### Return type

The resolved state mirrors the baseline data structure but each item carries optional change metadata:
- `changeInfo?: { revisionNumber, changeType }` -- present if the item was affected by any revision up to the requested point

## AI Generation Integration

### Generate page changes

- When a project has revisions, show a revision selector dropdown (default: latest finalized revision, or baseline if none)
- Selected revision determines which resolved state feeds into prompt generation

### Generation modes

Existing 4 output types work unchanged but receive resolved state instead of baseline.

New output type `revision_changelog` (add to the `OutputType` Prisma enum):
- Generates a document describing only changes in a specific revision
- Lists added, modified, removed items with context from the baseline
- Useful for handing to a development team already familiar with the project

### Prompt changes

- `buildUserPrompt` receives resolved state (no structural change needed, just different input data)
- New `buildChangelogPrompt(revisionChanges, baselineContext)` function for changes-only generation
- `buildSystemPrompt` gains a new case for `revision_changelog` output type

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/app/(dashboard)/project/[id]/revisions/page.tsx` | Revisions list page |
| `src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx` | Revision editor page |
| `src/components/revisions/revisions-list.tsx` | List of revision cards with create button |
| `src/components/revisions/revision-editor.tsx` | Main editor client component |
| `src/components/revisions/revision-tabs.tsx` | Tabbed interface for editing changes |
| `src/components/revisions/change-badge.tsx` | Added/Modified/Removed badge component |
| `src/components/revisions/revision-header.tsx` | Title, status badge, finalize button |
| `src/actions/revisions.ts` | Server actions for revisions and changes |
| `src/lib/revisions.ts` | Cumulative state resolver |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Revision, RevisionChange models, enums, relations on Project and User, add `revision_changelog` to OutputType enum |
| `src/components/layout/project-tabs.tsx` | Add "Revisions" tab |
| `src/app/(dashboard)/project/[id]/generate/page.tsx` | Add revision selector dropdown |
| `src/lib/generation/prompts.ts` | Add `buildChangelogPrompt`, add `revision_changelog` system prompt |
| `src/app/api/generate/route.ts` | Accept optional revisionNumber, use resolver for state |

## Future Considerations (Not in v1)

- Diff view between any two revisions
- Revision comments/discussion threads
- Approval workflow for revisions (review before finalize)
- Export revision history as a changelog document
- Merge/cherry-pick changes between revisions
- Revision templates (common change patterns)
