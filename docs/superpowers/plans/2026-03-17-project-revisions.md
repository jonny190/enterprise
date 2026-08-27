# Project Revisions Implementation Plan

> **Historical record.** This plan has already shipped. Do not implement it.
> It predates the modular restructure, so the paths below are out of date
> (`src/actions/` and `src/lib/generation/` are now `src/modules/`).
> See [docs/superpowers/README.md](../README.md) for context.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add revision tracking to projects so users can layer additions, modifications, and removals on top of existing requirements, with AI generation support for both full resolved specs and changes-only changelogs.

**Architecture:** New `Revision` and `RevisionChange` Prisma models store a linear chain of named revisions with typed change records. A cumulative state resolver computes the project state at any revision point. A dedicated revision editor renders resolved state with inline change controls. The generation pipeline accepts an optional revision parameter to generate from resolved state or produce changelogs.

**Tech Stack:** Prisma 7, Next.js 16 Server Actions, shadcn/ui (Tabs, Button, Input, Textarea), Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-17-project-revisions-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/actions/revisions.ts` | Server actions: revision CRUD, change CRUD |
| `src/lib/revisions.ts` | Cumulative state resolver |
| `src/app/(dashboard)/project/[id]/revisions/page.tsx` | Revisions list page (server component) |
| `src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx` | Revision editor page (server component) |
| `src/components/revisions/revisions-list.tsx` | Revision cards with create button |
| `src/components/revisions/revision-header.tsx` | Title, status badge, finalize/delete buttons |
| `src/components/revisions/revision-editor.tsx` | Main editor client component |
| `src/components/revisions/revision-tabs.tsx` | Tabbed interface for editing changes per section |
| `src/components/revisions/change-badge.tsx` | Added/Modified/Removed badge component |
| `src/components/generate/revision-selector.tsx` | Dropdown to select revision for generation |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Revision, RevisionChange models, enums, relations on Project/User, add revision_changelog to OutputType |
| `src/components/layout/project-tabs.tsx` | Add "Revisions" tab |
| `src/app/(dashboard)/project/[id]/generate/page.tsx` | Fetch revisions, pass to GenerationPreview |
| `src/components/generate/generation-preview.tsx` | Add revision selector, pass revisionNumber to API |
| `src/components/generate/output-type-picker.tsx` | Add revision_changelog output type |
| `src/app/api/generate/route.ts` | Accept revisionNumber param, use resolver |
| `src/lib/generation/prompts.ts` | Add buildChangelogPrompt, add revision_changelog system prompt |

---

## Task 1: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to schema**

Add after the `ProcessFlow` model:

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

- [ ] **Step 2: Add relations to Project and User models**

Add to the `Project` model after `processFlows`:
```prisma
  revisions    Revision[]
```

Add to the `User` model after `generatedOutputs`:
```prisma
  revisionsCreated Revision[] @relation("RevisionCreatedBy")
```

- [ ] **Step 3: Add revision_changelog to OutputType enum**

Update the `OutputType` enum:
```prisma
enum OutputType {
  ai_prompt
  requirements_doc
  project_brief
  technical_spec
  revision_changelog
}
```

- [ ] **Step 4: Generate Prisma client and create migration**

```bash
npx prisma generate
```

Create migration file manually at `prisma/migrations/20260317200000_add_revisions/migration.sql` following the pattern of existing migrations.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add Revision and RevisionChange models with enums"
```

---

## Task 2: Server Actions

**Files:**
- Create: `src/actions/revisions.ts`

- [ ] **Step 1: Create revisions server actions**

Follow the pattern from `src/actions/requirements.ts` for auth and CRUD. The file needs:

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { ChangeType, TargetType } from "@prisma/client";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);
  return { project, user };
}

async function getRevisionWithAuth(revisionId: string) {
  const revision = await prisma.revision.findUniqueOrThrow({
    where: { id: revisionId },
    include: { project: { include: { org: true } } },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, revision.project.orgId);
  return { revision, user };
}

export async function createRevision(projectId: string, title: string) {
  const { user } = await getProjectWithAuth(projectId);

  // Check no existing draft
  const existingDraft = await prisma.revision.findFirst({
    where: { projectId, status: "draft" },
  });
  if (existingDraft) throw new Error("A draft revision already exists");

  // Get next revision number
  const lastRevision = await prisma.revision.findFirst({
    where: { projectId },
    orderBy: { revisionNumber: "desc" },
  });
  const nextNumber = (lastRevision?.revisionNumber ?? 0) + 1;

  const revision = await prisma.revision.create({
    data: {
      projectId,
      revisionNumber: nextNumber,
      title,
      createdById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}`);
  return revision;
}

export async function updateRevision(
  id: string,
  data: { title?: string; description?: string }
) {
  const { revision } = await getRevisionWithAuth(id);
  if (revision.status !== "draft") throw new Error("Cannot edit finalized revision");

  await prisma.revision.update({ where: { id }, data });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}

export async function finalizeRevision(id: string) {
  const { revision } = await getRevisionWithAuth(id);
  if (revision.status !== "draft") throw new Error("Already finalized");

  await prisma.revision.update({
    where: { id },
    data: { status: "finalized" },
  });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}

export async function deleteRevision(id: string) {
  const { revision } = await getRevisionWithAuth(id);
  if (revision.status !== "draft") throw new Error("Cannot delete finalized revision");

  await prisma.revision.delete({ where: { id } });
  revalidatePath(`/project/${revision.projectId}`);
  return { success: true };
}

export async function addChange(
  revisionId: string,
  changeType: ChangeType,
  targetType: TargetType,
  targetId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  const { revision } = await getRevisionWithAuth(revisionId);
  if (revision.status !== "draft") throw new Error("Cannot modify finalized revision");

  const change = await prisma.revisionChange.create({
    data: {
      revisionId,
      changeType,
      targetType,
      targetId,
      data,
    },
  });
  revalidatePath(`/project/${revision.projectId}`);
  return change;
}

export async function updateChange(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changeData: any
) {
  const change = await prisma.revisionChange.findUniqueOrThrow({
    where: { id },
    include: { revision: { include: { project: { include: { org: true } } } } },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, change.revision.project.orgId);
  if (change.revision.status !== "draft") throw new Error("Cannot modify finalized revision");

  await prisma.revisionChange.update({
    where: { id },
    data: { data: changeData },
  });
  revalidatePath(`/project/${change.revision.projectId}`);
  return { success: true };
}

export async function deleteChange(id: string) {
  const change = await prisma.revisionChange.findUniqueOrThrow({
    where: { id },
    include: { revision: { include: { project: { include: { org: true } } } } },
  });
  const user = await requireSession();
  await requireOrgMembership(user.id, change.revision.project.orgId);
  if (change.revision.status !== "draft") throw new Error("Cannot modify finalized revision");

  await prisma.revisionChange.delete({ where: { id } });
  revalidatePath(`/project/${change.revision.projectId}`);
  return { success: true };
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run lint
git add src/actions/revisions.ts
git commit -m "feat: add revision and change server actions"
```

---

## Task 3: Cumulative State Resolver

**Files:**
- Create: `src/lib/revisions.ts`

- [ ] **Step 1: Create the resolver**

This is the core logic. It takes baseline project data plus revision changes and computes the resolved state. Read the spec's algorithm section for the exact behavior.

```typescript
import { prisma } from "@/lib/prisma";
import { type ChangeType } from "@prisma/client";

export type ChangeInfo = {
  revisionNumber: number;
  changeType: ChangeType;
  changeId: string;
};

export type ResolvedItem<T> = T & {
  changeInfo?: ChangeInfo;
};

export type ResolvedProjectState = {
  meta: ResolvedItem<{
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  }>;
  objectives: ResolvedItem<{ id: string; title: string; successCriteria: string }>[];
  userStories: ResolvedItem<{ id: string; role: string; capability: string; benefit: string; priority: string }>[];
  requirementCategories: ResolvedItem<{
    id: string;
    type: string;
    name: string;
    requirements: ResolvedItem<{
      id: string;
      title: string;
      description: string;
      priority: string;
      metrics: { id: string; metricName: string; targetValue: string; unit: string }[];
    }>[];
  }>[];
  processFlows: ResolvedItem<{ id: string; name: string; flowType: string; diagramData: unknown }>[];
};

export async function resolveProjectState(
  projectId: string,
  revisionNumber?: number | null,
  includeDraftId?: string | null,
  stripRemoved: boolean = false
): Promise<ResolvedProjectState> {
  // 1. Fetch baseline
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

  // Build mutable state from baseline
  const state: ResolvedProjectState = {
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

  if (!revisionNumber && !includeDraftId) return state;

  // 2. Fetch revisions to apply
  const revisions = await prisma.revision.findMany({
    where: {
      projectId,
      OR: [
        ...(revisionNumber ? [{ status: "finalized" as const, revisionNumber: { lte: revisionNumber } }] : []),
        ...(includeDraftId ? [{ id: includeDraftId }] : []),
      ],
    },
    orderBy: { revisionNumber: "asc" },
    include: {
      changes: { orderBy: { sortOrder: "asc" } },
    },
  });

  // 3. Apply changes sequentially
  for (const revision of revisions) {
    for (const change of revision.changes) {
      const info: ChangeInfo = {
        revisionNumber: revision.revisionNumber,
        changeType: change.changeType,
        changeId: change.id,
      };
      const d = change.data as Record<string, unknown>;

      switch (change.targetType) {
        case "objective":
          applyChange(state.objectives, change, info, d);
          break;
        case "user_story":
          applyChange(state.userStories, change, info, d);
          break;
        case "requirement_category":
          applyChangeCat(state.requirementCategories, change, info, d);
          break;
        case "requirement":
          applyChangeReq(state.requirementCategories, change, info, d);
          break;
        case "nfr_metric":
          applyChangeMetric(state.requirementCategories, change, info, d);
          break;
        case "process_flow":
          applyChange(state.processFlows, change, info, d);
          break;
        case "project_meta":
          Object.assign(state.meta, d);
          state.meta.changeInfo = info;
          break;
      }
    }
  }

  // Strip removed items when generating (not for editor UI)
  if (stripRemoved) {
    state.objectives = state.objectives.filter((i) => i.changeInfo?.changeType !== "removed");
    state.userStories = state.userStories.filter((i) => i.changeInfo?.changeType !== "removed");
    state.processFlows = state.processFlows.filter((i) => i.changeInfo?.changeType !== "removed");
    state.requirementCategories = state.requirementCategories
      .filter((c) => c.changeInfo?.changeType !== "removed")
      .map((c) => ({
        ...c,
        requirements: c.requirements.filter((r) => r.changeInfo?.changeType !== "removed"),
      }));
  }

  return state;
}

function applyChange<T extends { id: string; changeInfo?: ChangeInfo }>(
  items: T[],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  if (change.changeType === "added") {
    items.push({ ...data, changeInfo: info } as T);
  } else if (change.changeType === "modified" && change.targetId) {
    const idx = items.findIndex((i) => i.id === change.targetId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...data, changeInfo: info };
    }
  } else if (change.changeType === "removed" && change.targetId) {
    const idx = items.findIndex((i) => i.id === change.targetId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], changeInfo: info };
    }
  }
}

function applyChangeCat(
  categories: ResolvedProjectState["requirementCategories"],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  if (change.changeType === "added") {
    categories.push({ ...data, requirements: [], changeInfo: info } as ResolvedProjectState["requirementCategories"][0]);
  } else if (change.changeType === "modified" && change.targetId) {
    const idx = categories.findIndex((c) => c.id === change.targetId);
    if (idx >= 0) {
      categories[idx] = { ...categories[idx], ...data, changeInfo: info };
    }
  } else if (change.changeType === "removed" && change.targetId) {
    const idx = categories.findIndex((c) => c.id === change.targetId);
    if (idx >= 0) {
      categories[idx] = { ...categories[idx], changeInfo: info };
    }
  }
}

function applyChangeReq(
  categories: ResolvedProjectState["requirementCategories"],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  const categoryId = data.categoryId as string;
  if (change.changeType === "added") {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      cat.requirements.push({ ...data, metrics: (data.metrics as []) ?? [], changeInfo: info } as ResolvedProjectState["requirementCategories"][0]["requirements"][0]);
    }
  } else if (change.changeType === "modified" && change.targetId) {
    for (const cat of categories) {
      const idx = cat.requirements.findIndex((r) => r.id === change.targetId);
      if (idx >= 0) {
        cat.requirements[idx] = { ...cat.requirements[idx], ...data, changeInfo: info };
        break;
      }
    }
  } else if (change.changeType === "removed" && change.targetId) {
    for (const cat of categories) {
      const idx = cat.requirements.findIndex((r) => r.id === change.targetId);
      if (idx >= 0) {
        cat.requirements[idx] = { ...cat.requirements[idx], changeInfo: info };
        break;
      }
    }
  }
}

function applyChangeMetric(
  categories: ResolvedProjectState["requirementCategories"],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  const requirementId = data.requirementId as string;
  for (const cat of categories) {
    const req = cat.requirements.find((r) => r.id === requirementId);
    if (!req) continue;
    if (change.changeType === "added") {
      req.metrics.push(data as ResolvedProjectState["requirementCategories"][0]["requirements"][0]["metrics"][0]);
    } else if (change.changeType === "modified" && change.targetId) {
      const idx = req.metrics.findIndex((m) => m.id === change.targetId);
      if (idx >= 0) req.metrics[idx] = { ...req.metrics[idx], ...data };
    } else if (change.changeType === "removed" && change.targetId) {
      req.metrics = req.metrics.filter((m) => m.id !== change.targetId);
    }
    break;
  }
}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run lint
git add src/lib/revisions.ts
git commit -m "feat: add cumulative state resolver for revisions"
```

---

## Task 4: Change Badge Component

**Files:**
- Create: `src/components/revisions/change-badge.tsx`

- [ ] **Step 1: Create the badge component**

A small component that renders a colored badge based on change type. Also handles undo clicks for draft changes.

```tsx
"use client";

import { type ChangeType } from "@prisma/client";
import { X } from "lucide-react";

type ChangeBadgeProps = {
  changeType: ChangeType;
  onUndo?: () => void;
};

const styles: Record<ChangeType, { label: string; className: string }> = {
  added: { label: "Added", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  modified: { label: "Modified", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  removed: { label: "Removed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function ChangeBadge({ changeType, onUndo }: ChangeBadgeProps) {
  const style = styles[changeType];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
      {onUndo && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
          className="hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/revisions/change-badge.tsx
git commit -m "feat: add change badge component for revision changes"
```

---

## Task 5: Revision Header Component

**Files:**
- Create: `src/components/revisions/revision-header.tsx`

- [ ] **Step 1: Create the header component**

Shows revision title (editable for drafts), status badge, and action buttons.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateRevision, finalizeRevision, deleteRevision } from "@/actions/revisions";
import { useRouter } from "next/navigation";
import { Lock, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

type RevisionHeaderProps = {
  revisionId: string;
  projectId: string;
  title: string;
  revisionNumber: number;
  status: string;
  changeCount: number;
};

export function RevisionHeader({
  revisionId,
  projectId,
  title,
  revisionNumber,
  status,
  changeCount,
}: RevisionHeaderProps) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const isDraft = status === "draft";

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) return;
    await updateRevision(revisionId, { title: titleValue.trim() });
    setEditingTitle(false);
  };

  const handleFinalize = async () => {
    if (!confirm("Finalize this revision? This cannot be undone.")) return;
    await finalizeRevision(revisionId);
    toast.success("Revision finalized");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft revision?")) return;
    await deleteRevision(revisionId);
    router.push(`/project/${projectId}/revisions`);
  };

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-muted px-2 py-1 text-sm font-mono">
          Rev {revisionNumber}
        </span>
        {isDraft && editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
            className="w-64"
            autoFocus
          />
        ) : (
          <h2
            className={`text-lg font-semibold ${isDraft ? "cursor-pointer hover:text-muted-foreground" : ""}`}
            onClick={() => isDraft && setEditingTitle(true)}
          >
            {title}
          </h2>
        )}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isDraft
              ? "bg-amber-500/20 text-amber-400"
              : "bg-green-500/20 text-green-400"
          }`}
        >
          {isDraft ? "Draft" : "Finalized"}
        </span>
        <span className="text-sm text-muted-foreground">
          {changeCount} change{changeCount !== 1 ? "s" : ""}
        </span>
      </div>
      {isDraft && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleFinalize}>
            <Check className="mr-2 h-4 w-4" />
            Finalize
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
      {!isDraft && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Read-only
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/revisions/revision-header.tsx
git commit -m "feat: add revision header with title editing, finalize, delete"
```

---

## Task 6: Revision Tabs (Editor UI)

**Files:**
- Create: `src/components/revisions/revision-tabs.tsx`

- [ ] **Step 1: Create the tabbed revision editor**

This is the most complex component. It renders the resolved state with change badges and inline modify/remove/add controls. Follow the pattern from `src/components/requirements/requirements-tabs.tsx` but with change-aware rendering.

The component receives:
- The resolved project state (with changeInfo annotations)
- The current revision's changes (for undo functionality)
- Whether the revision is a draft (controls editability)
- The revision ID and project ID (for server actions)

Each tab renders items from the resolved state. Items with `changeInfo` from the current revision show colored badges with undo buttons. Items with `changeInfo.changeType === "removed"` show with strikethrough.

For draft revisions, each item has Modify and Remove buttons. "Add" buttons appear at section bottoms.

This component is large but follows the existing requirements-tabs pattern closely. Read `src/components/requirements/requirements-tabs.tsx` for the exact tab structure, then adapt it:
- Replace direct CRUD actions with `addChange`, `updateChange`, `deleteChange`
- Add ChangeBadge rendering based on item.changeInfo
- Add strikethrough styling for removed items
- Add Modify/Remove buttons on hover for draft revisions

The tabs should be: Meta, Objectives, User Stories, NFRs, Constraints, Process Flows.

- [ ] **Step 2: Verify and commit**

```bash
npm run lint
git add src/components/revisions/revision-tabs.tsx
git commit -m "feat: add revision tabs editor with change tracking UI"
```

---

## Task 7: Revision Editor (Main Client Component)

**Files:**
- Create: `src/components/revisions/revision-editor.tsx`

- [ ] **Step 1: Create the main editor component**

Combines RevisionHeader and RevisionTabs. Receives all data from the server component page.

```tsx
"use client";

import { type ChangeType } from "@prisma/client";
import { RevisionHeader } from "./revision-header";
import { RevisionTabs } from "./revision-tabs";
import { type ResolvedProjectState, type ChangeInfo } from "@/lib/revisions";

type RevisionChange = {
  id: string;
  changeType: ChangeType;
  targetType: string;
  targetId: string | null;
  data: Record<string, unknown>;
};

type RevisionEditorProps = {
  revisionId: string;
  projectId: string;
  revisionNumber: number;
  title: string;
  status: string;
  resolvedState: ResolvedProjectState;
  changes: RevisionChange[];
};

export function RevisionEditor({
  revisionId,
  projectId,
  revisionNumber,
  title,
  status,
  resolvedState,
  changes,
}: RevisionEditorProps) {
  const isDraft = status === "draft";

  return (
    <div>
      <RevisionHeader
        revisionId={revisionId}
        projectId={projectId}
        title={title}
        revisionNumber={revisionNumber}
        status={status}
        changeCount={changes.length}
      />
      <div className="p-4">
        <RevisionTabs
          revisionId={revisionId}
          projectId={projectId}
          revisionNumber={revisionNumber}
          resolvedState={resolvedState}
          changes={changes}
          isDraft={isDraft}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/revisions/revision-editor.tsx
git commit -m "feat: add revision editor main component"
```

---

## Task 8: Revisions List Component

**Files:**
- Create: `src/components/revisions/revisions-list.tsx`

- [ ] **Step 1: Create the revisions list**

Shows revision cards with create button. Follow the flow-list pattern from the processes feature.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRevision } from "@/actions/revisions";
import { toast } from "sonner";

type Revision = {
  id: string;
  revisionNumber: number;
  title: string;
  status: string;
  createdAt: string;
  _count: { changes: number };
  createdBy: { name: string };
};

type RevisionsListProps = {
  projectId: string;
  revisions: Revision[];
};

export function RevisionsList({ projectId, revisions }: RevisionsListProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const hasDraft = revisions.some((r) => r.status === "draft");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const revision = await createRevision(projectId, newTitle.trim());
      setNewTitle("");
      setAdding(false);
      router.push(`/project/${projectId}/revisions/${revision.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create revision");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revisions</h1>
        {!hasDraft && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Revision
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 rounded-lg border p-4">
          <Input
            placeholder="Revision title (e.g. Phase 2 Features)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button onClick={handleCreate}>Create</Button>
          <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}

      {revisions.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No revisions yet. Create one to start tracking changes.
        </div>
      )}

      {revisions.map((rev) => (
        <div
          key={rev.id}
          className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-accent/50"
          onClick={() => router.push(`/project/${projectId}/revisions/${rev.id}`)}
        >
          <div className="flex items-center gap-3">
            {rev.status === "finalized" ? (
              <Lock className="h-5 w-5 text-green-500" />
            ) : (
              <FileText className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  Rev {rev.revisionNumber}
                </span>
                <span className="font-medium">{rev.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    rev.status === "draft"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {rev.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {rev._count.changes} change{rev._count.changes !== 1 ? "s" : ""} -- by {rev.createdBy.name}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/revisions/revisions-list.tsx
git commit -m "feat: add revisions list with create, status badges"
```

---

## Task 9: Revisions Pages + Tab Navigation

**Files:**
- Create: `src/app/(dashboard)/project/[id]/revisions/page.tsx`
- Create: `src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx`
- Modify: `src/components/layout/project-tabs.tsx`

- [ ] **Step 1: Create revisions list page**

Follow the pattern from `src/app/(dashboard)/project/[id]/requirements/page.tsx`.

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RevisionsList } from "@/components/revisions/revisions-list";

export default async function RevisionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      revisions: {
        orderBy: { revisionNumber: "asc" },
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { changes: true } },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  return (
    <div className="p-4">
      <RevisionsList
        projectId={id}
        revisions={project.revisions.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create revision editor page**

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveProjectState } from "@/lib/revisions";
import { RevisionEditor } from "@/components/revisions/revision-editor";

export default async function RevisionEditorPage({
  params,
}: {
  params: Promise<{ id: string; revisionId: string }>;
}) {
  const { id, revisionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
    include: {
      changes: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!revision || revision.projectId !== id) redirect(`/project/${id}/revisions`);

  // Resolve state up to the previous finalized revision, then include draft if applicable
  const resolvedState = await resolveProjectState(
    id,
    revision.status === "finalized" ? revision.revisionNumber : revision.revisionNumber - 1,
    revision.status === "draft" ? revision.id : null
  );

  return (
    <RevisionEditor
      revisionId={revisionId}
      projectId={id}
      revisionNumber={revision.revisionNumber}
      title={revision.title}
      status={revision.status}
      resolvedState={resolvedState}
      changes={revision.changes.map((c) => ({
        id: c.id,
        changeType: c.changeType,
        targetType: c.targetType,
        targetId: c.targetId,
        data: c.data as Record<string, unknown>,
      }))}
    />
  );
}
```

- [ ] **Step 3: Add Revisions tab to project-tabs.tsx**

Add `{ label: "Revisions", href: "revisions" }` between Processes and Generate.

- [ ] **Step 4: Verify build and commit**

```bash
npm run build 2>&1 | tail -10
git add src/app/\(dashboard\)/project/\[id\]/revisions/ src/components/layout/project-tabs.tsx
git commit -m "feat: add revisions pages and tab navigation"
```

---

## Task 10: AI Generation Integration

**Files:**
- Create: `src/components/generate/revision-selector.tsx`
- Modify: `src/components/generate/output-type-picker.tsx`
- Modify: `src/components/generate/generation-preview.tsx`
- Modify: `src/app/(dashboard)/project/[id]/generate/page.tsx`
- Modify: `src/app/api/generate/route.ts`
- Modify: `src/lib/generation/prompts.ts`

- [ ] **Step 1: Create revision selector dropdown**

```tsx
"use client";

type RevisionOption = {
  revisionNumber: number;
  title: string;
  status: string;
};

type RevisionSelectorProps = {
  revisions: RevisionOption[];
  selected: number | null;
  onSelect: (revisionNumber: number | null) => void;
};

export function RevisionSelector({ revisions, selected, onSelect }: RevisionSelectorProps) {
  if (revisions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Generate from:</label>
      <select
        value={selected ?? "baseline"}
        onChange={(e) => onSelect(e.target.value === "baseline" ? null : Number(e.target.value))}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
      >
        <option value="baseline">Baseline (original)</option>
        {revisions
          .filter((r) => r.status === "finalized")
          .map((r) => (
            <option key={r.revisionNumber} value={r.revisionNumber}>
              Rev {r.revisionNumber}: {r.title}
            </option>
          ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Add revision_changelog to output-type-picker.tsx**

Read the file, then add a new entry to the output types array:
```typescript
{ value: "revision_changelog", label: "Revision Changelog", description: "Changes-only document for a specific revision" }
```

- [ ] **Step 3: Update generation-preview.tsx**

Read the file. Add:
- New `revisions` prop: `{ revisionNumber: number; title: string; status: string }[]` (the list of finalized revisions for the dropdown)
- New internal state: `const [revisionNumber, setRevisionNumber] = useState<number | null>(null)`
- Render `RevisionSelector` above the output type picker, passing `revisions` prop for options and state for selection
- Pass `revisionNumber` in the fetch body to `/api/generate`
- Conditionally show/hide `revision_changelog` in the output type picker (only when `revisionNumber !== null`)

Note: `revisionNumber` is internal state (not a prop) because the user selects it interactively. The `revisions` list is a prop because it comes from the server.

- [ ] **Step 4: Update generate page to fetch and pass revisions**

Read `src/app/(dashboard)/project/[id]/generate/page.tsx`. Add `revisions` to the Prisma include:
```typescript
revisions: {
  where: { status: "finalized" },
  orderBy: { revisionNumber: "asc" },
  select: { revisionNumber: true, title: true, status: true },
},
```
Pass as prop: `revisions={project.revisions}` to GenerationPreview.

- [ ] **Step 5: Update generate API route**

Read `src/app/api/generate/route.ts`. Add:
- Extract `revisionNumber` from request body
- If `revisionNumber` is provided and `outputType !== "revision_changelog"`, use `resolveProjectState(projectId, revisionNumber, null, true)` to get resolved state with removed items stripped, then pass to `generateOutput`
- For `revision_changelog` output type:

```typescript
if (outputType === "revision_changelog") {
  if (!revisionNumber) {
    return NextResponse.json({ error: "Revision number required for changelog" }, { status: 400 });
  }
  const revision = await prisma.revision.findFirst({
    where: { projectId, revisionNumber, status: "finalized" },
    include: { changes: { orderBy: { sortOrder: "asc" } } },
  });
  if (!revision) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }
  // Get baseline state at previous revision for context
  const baselineState = await resolveProjectState(projectId, revisionNumber - 1, null, true);
  const changelogPrompt = buildChangelogPrompt(revision.changes, baselineState, revision.title, revisionNumber);
  const systemPrompt = buildSystemPrompt("revision_changelog");
  // Use streaming generation with the changelog prompt
  const stream = await generateOutputFromPrompt(systemPrompt, changelogPrompt);
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```

This requires adding a `generateOutputFromPrompt(system, user)` helper to `generate.ts` that takes raw prompt strings (the existing `generateOutput` takes structured data).

- [ ] **Step 6: Add changelog prompt to prompts.ts**

Read `src/lib/generation/prompts.ts`. Add:

New case in `buildSystemPrompt` for `"revision_changelog"`:
```typescript
case "revision_changelog":
  return base + "\nYou are generating a changelog document describing what changed in a project revision. List all additions, modifications, and removals clearly. Group changes by type (objectives, user stories, requirements, etc.). For modifications, describe what changed from the original. Write in a clear, professional style suitable for handing to a development team.";
```

New function:
```typescript
export function buildChangelogPrompt(
  changes: { changeType: string; targetType: string; targetId: string | null; data: unknown }[],
  baselineState: ResolvedProjectState,
  revisionTitle: string,
  revisionNumber: number
): string {
  let prompt = `# Revision ${revisionNumber}: ${revisionTitle}\n\n`;
  prompt += `Generate a changelog document for this revision. Here are the changes:\n\n`;

  const grouped = new Map<string, typeof changes>();
  for (const change of changes) {
    const group = grouped.get(change.targetType) ?? [];
    group.push(change);
    grouped.set(change.targetType, group);
  }

  for (const [targetType, typeChanges] of grouped) {
    prompt += `## ${targetType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Changes\n\n`;
    for (const change of typeChanges) {
      const data = change.data as Record<string, unknown>;
      prompt += `- **${change.changeType.toUpperCase()}**`;
      if (change.changeType === "added") {
        prompt += `: ${JSON.stringify(data)}\n`;
      } else if (change.changeType === "modified" && change.targetId) {
        prompt += ` (ID: ${change.targetId}): Changed fields: ${JSON.stringify(data)}\n`;
      } else if (change.changeType === "removed" && change.targetId) {
        prompt += ` (ID: ${change.targetId})\n`;
      }
    }
    prompt += "\n";
  }

  prompt += `\n## Current Baseline Context\n\n`;
  prompt += `The project has ${baselineState.objectives.length} objectives, `;
  prompt += `${baselineState.userStories.length} user stories, `;
  prompt += `${baselineState.requirementCategories.length} requirement categories, `;
  prompt += `and ${baselineState.processFlows.length} process flows.\n`;

  return prompt;
}
```

- [ ] **Step 7: Verify build and commit**

```bash
npm run build 2>&1 | tail -10
git add src/components/generate/ src/app/api/generate/ src/lib/generation/ src/app/\(dashboard\)/project/\[id\]/generate/
git commit -m "feat: add revision selector and changelog generation to AI pipeline"
```

---

## Task 11: Integration Testing and Polish

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 3: Manual verification checklist**

Start the dev server and verify:

```bash
npm run dev
```

- Navigate to a project, confirm "Revisions" tab appears
- Click Revisions tab, confirm empty state
- Create a new revision with a title
- In the revision editor, verify tabs show baseline data
- Add a new objective, confirm green "Added" badge appears
- Modify an existing user story, confirm amber "Modified" badge
- Remove a requirement, confirm red "Removed" badge with strikethrough
- Undo a change by clicking the X on the badge
- Finalize the revision, confirm it becomes read-only
- Create a second revision, confirm it includes Rev 1 changes in baseline
- Navigate to Generate, confirm revision selector dropdown appears
- Generate from a specific revision, confirm output reflects changes
- Generate a revision changelog, confirm only changes are described

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish revision editor integration"
```
