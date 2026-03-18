# Version Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the granular change-tracking revision system with a version-snapshot model where V1 is the original project (locked), and users create V2, V3, etc. as full snapshots they can view and switch between.

**Architecture:** Remove the `RevisionChange` model and the complex state resolver. Instead, each `Revision` (renamed conceptually to "Version") stores a full JSON snapshot of all project data at that point in time. Creating a new version snapshots the current live project data, locks it, and the live project data becomes the new working version. Users can view any past version's snapshot read-only via the same tabbed UI.

**Tech Stack:** Prisma 7, Next.js App Router, Server Actions, shadcn/ui

---

## File Structure

### Modified Files
- `prisma/schema.prisma` - Remove `RevisionChange` model, `ChangeType` enum, `TargetType` enum. Add `snapshot` Json field to `Revision`. Remove `changes` relation.
- `src/actions/revisions.ts` - Replace with version-based actions: `createVersion` (snapshots current state, creates locked version), `deleteVersion` (draft only). Remove all change-related actions.
- `src/lib/revisions.ts` - Complete rewrite. Remove state resolver. Add `snapshotProjectState()` to capture current project data as JSON. Add `getVersionState()` to return parsed snapshot.
- `src/app/(dashboard)/project/[id]/revisions/page.tsx` - Rename to Versions. Show version list with V1, V2 labels. Current (live) version shown at top.
- `src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx` - Show read-only snapshot view for locked versions.
- `src/components/revisions/revisions-list.tsx` - Redesign as version timeline. Show V1, V2, V3 cards with locked status. "Create New Version" button snapshots current state.
- `src/components/revisions/revision-header.tsx` - Simplify to show version number, title, locked badge. No finalize/delete for locked versions.
- `src/components/revisions/revision-editor.tsx` - Rename to VersionViewer. Always read-only (viewing a snapshot).
- `src/components/revisions/revision-tabs.tsx` - Strip all change-tracking, add/modify/remove controls. Pure read-only display of snapshot data.
- `src/components/revisions/change-badge.tsx` - Delete this file (no longer needed).
- `src/components/generate/revision-selector.tsx` - Update labels from "Rev N" to "V1", "V2". Keep same functionality.
- `src/components/generate/generation-preview.tsx` - Remove revision_changelog-specific handling.
- `src/components/generate/output-type-picker.tsx` - Remove "Revision Changelog" option.
- `src/app/api/generate/route.ts` - Remove changelog handling. Use snapshot data when version is selected instead of state resolver.
- `src/lib/generation/prompts.ts` - Remove `buildChangelogPrompt()` and `revision_changelog` case from `buildSystemPrompt()`.
- `src/components/layout/project-tabs.tsx` - Rename "Revisions" tab to "Versions".

---

### Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update Prisma schema**

Remove `RevisionChange` model, `ChangeType` enum, `TargetType` enum. Add `snapshot` Json field to `Revision`. Remove `changes` relation. Remove `revision_changelog` from the `OutputType` enum.

The Revision model becomes:
```prisma
model Revision {
  id              String         @id @default(uuid())
  projectId       String
  revisionNumber  Int
  title           String
  description     String         @default("")
  status          RevisionStatus @default(draft)
  snapshot        Json           @default("{}")
  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy User     @relation("RevisionCreatedBy", fields: [createdById], references: [id])

  @@unique([projectId, revisionNumber])
}
```

- [ ] **Step 2: Generate Prisma client and create migration**

Run:
```bash
npx prisma migrate dev --name version-snapshots
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: simplify revision schema to version snapshots"
```

---

### Task 2: Rewrite State Resolver

**Files:**
- Modify: `src/lib/revisions.ts`

- [ ] **Step 1: Replace state resolver with snapshot utilities**

Remove all the complex change-application logic. Replace with two simple functions:

```typescript
import { prisma } from "@/lib/prisma";

export type VersionSnapshot = {
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  };
  objectives: { id: string; title: string; successCriteria: string }[];
  userStories: { id: string; role: string; capability: string; benefit: string; priority: string }[];
  requirementCategories: {
    id: string;
    type: string;
    name: string;
    requirements: {
      id: string;
      title: string;
      description: string;
      priority: string;
      metrics: { id: string; metricName: string; targetValue: string; unit: string }[];
    }[];
  }[];
  processFlows: { id: string; name: string; flowType: string; diagramData: unknown }[];
};

export async function snapshotProjectState(projectId: string): Promise<VersionSnapshot> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: {
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: {
            orderBy: { sortOrder: "asc" },
            include: { metrics: true },
          },
        },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  return {
    meta: {
      visionStatement: project.meta?.visionStatement ?? "",
      businessContext: project.meta?.businessContext ?? "",
      targetUsers: project.meta?.targetUsers ?? "",
      technicalConstraints: project.meta?.technicalConstraints ?? "",
      timeline: project.meta?.timeline ?? "",
      stakeholders: project.meta?.stakeholders ?? "",
      glossary: project.meta?.glossary ?? "",
    },
    objectives: project.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      successCriteria: o.successCriteria,
    })),
    userStories: project.userStories.map((s) => ({
      id: s.id,
      role: s.role,
      capability: s.capability,
      benefit: s.benefit,
      priority: s.priority,
    })),
    requirementCategories: project.requirementCategories.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      requirements: c.requirements.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        metrics: r.metrics.map((m) => ({
          id: m.id,
          metricName: m.metricName,
          targetValue: m.targetValue,
          unit: m.unit,
        })),
      })),
    })),
    processFlows: project.processFlows.map((f) => ({
      id: f.id,
      name: f.name,
      flowType: f.flowType,
      diagramData: f.diagramData,
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/revisions.ts
git commit -m "refactor: replace revision state resolver with snapshot utilities"
```

---

### Task 3: Rewrite Server Actions

**Files:**
- Modify: `src/actions/revisions.ts`

- [ ] **Step 1: Replace revision actions with version actions**

Remove all change-related actions. Replace with:

- `createVersion(projectId, title)` - Snapshots current project state, creates a locked (finalized) revision record with the snapshot JSON. Auto-increments version number.
- `deleteVersion(id)` - Only allows deleting the most recent version if needed (safety valve).
- Keep `getProjectWithAuth` and `getRevisionWithAuth` helpers.

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { snapshotProjectState } from "@/lib/revisions";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);
  return { project, user };
}

export async function createVersion(projectId: string, title: string) {
  const { user } = await getProjectWithAuth(projectId);

  const snapshot = await snapshotProjectState(projectId);

  const lastVersion = await prisma.revision.findFirst({
    where: { projectId },
    orderBy: { revisionNumber: "desc" },
  });
  const nextNumber = (lastVersion?.revisionNumber ?? 0) + 1;

  const version = await prisma.revision.create({
    data: {
      projectId,
      revisionNumber: nextNumber,
      title,
      status: "finalized",
      snapshot,
      createdById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return version;
}

export async function deleteVersion(id: string) {
  const user = await requireSession();
  const revision = await prisma.revision.findUniqueOrThrow({
    where: { id },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, revision.project.orgId);

  // Only allow deleting the most recent version
  const latest = await prisma.revision.findFirst({
    where: { projectId: revision.projectId },
    orderBy: { revisionNumber: "desc" },
  });
  if (latest?.id !== id) throw new Error("Can only delete the most recent version");

  await prisma.revision.delete({ where: { id } });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/revisions.ts
git commit -m "refactor: replace change-tracking actions with version snapshot actions"
```

---

### Task 4: Rewrite Versions List Page and Component

**Files:**
- Modify: `src/app/(dashboard)/project/[id]/revisions/page.tsx`
- Modify: `src/components/revisions/revisions-list.tsx`

- [ ] **Step 1: Update the revisions list page**

Remove `_count: { select: { changes: true } }` from the query since RevisionChange no longer exists. Pass versions to the component.

- [ ] **Step 2: Rewrite revisions-list.tsx as a version timeline**

Show each version as "V1", "V2", "V3" with a lock icon and created date. All versions are locked/finalized. The "Create New Version" button snapshots the current project state. Remove the draft/finalized status badges (all versions are always locked). Remove change counts.

The component should show:
- A header with "Versions" title and "Create Version" button
- A prompt for title when creating
- Each version card showing: V{number} badge, title, creator name, date, lock icon
- Clicking a version navigates to the read-only snapshot view

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/project/[id]/revisions/ src/components/revisions/revisions-list.tsx
git commit -m "feat: redesign revisions list as version timeline"
```

---

### Task 5: Rewrite Version Viewer (Snapshot View)

**Files:**
- Modify: `src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx`
- Modify: `src/components/revisions/revision-editor.tsx`
- Modify: `src/components/revisions/revision-header.tsx`
- Modify: `src/components/revisions/revision-tabs.tsx`
- Delete: `src/components/revisions/change-badge.tsx`

- [ ] **Step 1: Update the revision editor page**

Instead of resolving state from changes, just parse the `snapshot` JSON from the revision record. Pass it to the viewer as read-only data.

```typescript
const snapshot = revision.snapshot as VersionSnapshot;
```

No more `resolveProjectState()` call.

- [ ] **Step 2: Simplify revision-header.tsx**

Remove all editing controls (finalize, delete, edit title). Show: version number badge (V{n}), title, lock icon, "Read-only" label, created date.

- [ ] **Step 3: Simplify revision-editor.tsx to VersionViewer**

Remove `changes` prop. Remove `isDraft` logic. Always render as read-only.

- [ ] **Step 4: Completely rewrite revision-tabs.tsx**

Strip ALL change-tracking logic: no `addChange`, `deleteChange` imports. No `ChangeBadge`. No `isDraft` conditional editing. No add/modify/remove buttons. No form states.

Each tab is a pure read-only display of the snapshot data:
- Meta tab: read-only text fields
- Objectives tab: read-only cards
- User Stories tab: read-only cards
- NFRs tab: read-only collapsible categories with requirements
- Constraints tab: same as NFRs
- Process Flows tab: read-only cards

This dramatically simplifies the file from ~1346 lines to ~300-400 lines.

- [ ] **Step 5: Delete change-badge.tsx**

```bash
rm src/components/revisions/change-badge.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx \
  src/components/revisions/revision-editor.tsx \
  src/components/revisions/revision-header.tsx \
  src/components/revisions/revision-tabs.tsx
git rm src/components/revisions/change-badge.tsx
git commit -m "feat: replace revision editor with read-only version viewer"
```

---

### Task 6: Update Generation Pipeline

**Files:**
- Modify: `src/components/generate/revision-selector.tsx`
- Modify: `src/components/generate/generation-preview.tsx`
- Modify: `src/components/generate/output-type-picker.tsx`
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/app/(dashboard)/project/[id]/generate/page.tsx`
- Modify: `src/lib/generation/prompts.ts`

- [ ] **Step 1: Update revision-selector.tsx**

Change labels from "Rev N" to "V{n}". Change "Baseline (original)" to "Current" or "Latest". List versions in reverse order (newest first) so users see the most recent version first.

- [ ] **Step 2: Remove revision_changelog from output-type-picker.tsx**

Remove the `revision_changelog` entry from the `OUTPUT_TYPES` array.

- [ ] **Step 3: Update generate route**

Remove the changelog handling block. When a version number is selected, fetch the revision's snapshot JSON directly instead of calling `resolveProjectState()`. Parse the snapshot and pass to `generateOutput()`.

Remove the `resolveProjectState` import.

- [ ] **Step 4: Remove changelog prompt helpers**

In `prompts.ts`, remove `buildChangelogPrompt()` function and the `revision_changelog` case from `buildSystemPrompt()`.

- [ ] **Step 5: Commit**

```bash
git add src/components/generate/ src/app/api/generate/route.ts \
  src/app/(dashboard)/project/[id]/generate/page.tsx \
  src/lib/generation/prompts.ts
git commit -m "refactor: update generation pipeline for version snapshots"
```

---

### Task 7: Rename Tab and Final Cleanup

**Files:**
- Modify: `src/components/layout/project-tabs.tsx`

- [ ] **Step 1: Rename "Revisions" tab to "Versions"**

In the `tabs` array, change `{ label: "Revisions", href: "revisions" }` to `{ label: "Versions", href: "revisions" }`. Keep the href as "revisions" to avoid breaking URLs.

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Fix any TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/project-tabs.tsx
git commit -m "chore: rename Revisions tab to Versions"
```
