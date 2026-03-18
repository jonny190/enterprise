# Modular Codebase Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the codebase from a layer-based layout (actions/, components/, lib/) to a feature-based modular layout (modules/) so each feature's code lives together.

**Architecture:** Create a `src/modules/` directory with one folder per domain (auth, orgs, projects, requirements, wizard, processes, versions, generation, outputs). Each module contains its own actions, components, lib, and types. Shared infrastructure (prisma, auth, permissions, utils) stays in `src/lib/`. Shared UI primitives stay in `src/components/ui/`. Route pages in `src/app/` become thin wrappers importing from modules. Layout components stay in `src/components/layout/` as they span modules.

**Tech Stack:** Next.js 16 App Router, TypeScript, path alias `@/*`

---

## Target Structure

```
src/
  modules/
    auth/
      components/          # login-form, register-form, forgot-password-form, reset-password-form
      actions.ts           # from src/actions/auth.ts
    orgs/
      components/          # brand-settings, create-org-form, invite-form, member-list, org-settings-form
      actions.ts           # from src/actions/orgs.ts
    projects/
      components/          # create-project-dialog, project-settings-client
      actions.ts           # from src/actions/projects.ts
    requirements/
      components/          # editable-item, meta-editor, priority-badge, requirements-tabs, sortable-list
      actions.ts           # from src/actions/requirements.ts
    wizard/
      components/          # wizard-client, wizard-shell, step-*.tsx
      actions.ts           # from src/actions/wizard.ts
    processes/
      components/          # processes-client, flow-canvas, flow-list, flow-toolbar, generate-flow-dialog, nodes/
      actions.ts           # from src/actions/processes.ts
    versions/
      components/          # revision-editor, revision-header, revision-tabs, revisions-list
      actions.ts           # from src/actions/revisions.ts
      lib.ts               # from src/lib/revisions.ts (snapshot utilities)
    generation/
      components/          # generation-preview, output-type-picker, revision-selector, export-buttons
      actions.ts           # from src/actions/generation.ts
      lib/
        generate.ts        # from src/lib/generation/generate.ts
        prompts.ts         # from src/lib/generation/prompts.ts
    outputs/
      components/          # output-item
  components/
    ui/                    # shared shadcn components (unchanged)
    layout/                # org-rail, project-sidebar, project-tabs (unchanged)
    providers.tsx          # unchanged
  lib/                     # shared infra only: prisma.ts, auth.ts, auth-utils.ts, permissions.ts, email.ts, utils.ts
  app/                     # routes unchanged, pages update imports
```

## Guiding Rules

1. **Move files, update imports, nothing else.** No refactoring, renaming, or behavior changes.
2. **One module per task.** Each task moves one module, updates all imports, and verifies the build.
3. **`src/app/` pages stay where they are.** Only their import paths change.
4. **API routes stay where they are.** Only their import paths change.
5. **Build must pass after each task.** Run `npm run build` to confirm.

---

### Task 1: Create module structure and move auth module

**Files:**
- Create: `src/modules/auth/actions.ts` (move from `src/actions/auth.ts`)
- Create: `src/modules/auth/components/login-form.tsx` (move from `src/components/auth/login-form.tsx`)
- Create: `src/modules/auth/components/register-form.tsx` (move from `src/components/auth/register-form.tsx`)
- Create: `src/modules/auth/components/forgot-password-form.tsx` (move from `src/components/auth/forgot-password-form.tsx`)
- Create: `src/modules/auth/components/reset-password-form.tsx` (move from `src/components/auth/reset-password-form.tsx`)
- Modify: all files in `src/app/(auth)/` that import from `@/actions/auth` or `@/components/auth/`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/auth/components
mv src/actions/auth.ts src/modules/auth/actions.ts
mv src/components/auth/* src/modules/auth/components/
rmdir src/components/auth
```

- [ ] **Step 2: Update imports in moved files**

In each moved file, update any imports that reference other moved files. For example, if `login-form.tsx` imports from `@/actions/auth`, update to `@/modules/auth/actions`.

- [ ] **Step 3: Update imports in app route pages**

Update all files under `src/app/(auth)/` to import from `@/modules/auth/` instead of `@/actions/auth` and `@/components/auth/`.

- [ ] **Step 4: Search for any remaining old import paths**

```bash
grep -r "@/actions/auth" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/auth/" src/ --include="*.ts" --include="*.tsx"
```

Fix any remaining references.

- [ ] **Step 5: Build and verify**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move auth module to src/modules/auth"
```

---

### Task 2: Move orgs module

**Files:**
- Create: `src/modules/orgs/actions.ts` (move from `src/actions/orgs.ts`)
- Create: `src/modules/orgs/components/` (move from `src/components/org/`)
- Modify: `src/app/(dashboard)/org/[slug]/*/page.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, and any other files importing from `@/actions/orgs` or `@/components/org/`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/orgs/components
mv src/actions/orgs.ts src/modules/orgs/actions.ts
mv src/components/org/* src/modules/orgs/components/
rmdir src/components/org
```

- [ ] **Step 2: Update imports in moved files and consumers**

Update all import paths from `@/actions/orgs` to `@/modules/orgs/actions` and from `@/components/org/` to `@/modules/orgs/components/`.

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/orgs" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/org/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move orgs module to src/modules/orgs"
```

---

### Task 3: Move projects module

**Files:**
- Create: `src/modules/projects/actions.ts` (move from `src/actions/projects.ts`)
- Create: `src/modules/projects/components/` (move from `src/components/project/`)
- Modify: pages and components that import from `@/actions/projects` or `@/components/project/`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/projects/components
mv src/actions/projects.ts src/modules/projects/actions.ts
mv src/components/project/* src/modules/projects/components/
rmdir src/components/project
```

- [ ] **Step 2: Update imports in moved files and consumers**

Update all import paths. Note: `@/actions/projects` is imported by several components and pages. Search comprehensively:
- `src/app/(dashboard)/project/[id]/settings/page.tsx`
- `src/components/project/create-project-dialog.tsx` (now in modules)
- `src/components/project/project-settings-client.tsx` (now in modules)
- Any org pages that reference project creation

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/projects" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/project/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move projects module to src/modules/projects"
```

---

### Task 4: Move requirements module

**Files:**
- Create: `src/modules/requirements/actions.ts` (move from `src/actions/requirements.ts`)
- Create: `src/modules/requirements/components/` (move from `src/components/requirements/`)
- Modify: `src/app/(dashboard)/project/[id]/requirements/page.tsx`, `src/app/(dashboard)/project/[id]/meta/page.tsx`, and any other consumers

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/requirements/components
mv src/actions/requirements.ts src/modules/requirements/actions.ts
mv src/components/requirements/* src/modules/requirements/components/
rmdir src/components/requirements
```

- [ ] **Step 2: Update all imports**

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/requirements" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/requirements/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move requirements module to src/modules/requirements"
```

---

### Task 5: Move wizard module

**Files:**
- Create: `src/modules/wizard/actions.ts` (move from `src/actions/wizard.ts`)
- Create: `src/modules/wizard/components/` (move from `src/components/wizard/`)
- Modify: `src/app/(dashboard)/project/[id]/wizard/page.tsx`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/wizard/components
mv src/actions/wizard.ts src/modules/wizard/actions.ts
mv src/components/wizard/* src/modules/wizard/components/
rmdir src/components/wizard
```

- [ ] **Step 2: Update all imports**

Note: wizard components likely import from `@/actions/wizard` and `@/actions/requirements` (the latter is now at `@/modules/requirements/actions`). Update both.

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/wizard" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/wizard/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move wizard module to src/modules/wizard"
```

---

### Task 6: Move processes module

**Files:**
- Create: `src/modules/processes/actions.ts` (move from `src/actions/processes.ts`)
- Create: `src/modules/processes/components/` (move from `src/components/processes/`, including `nodes/` subdirectory)
- Modify: `src/app/(dashboard)/project/[id]/processes/page.tsx`, `src/app/api/generate-flow/route.ts`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/processes/components
mv src/actions/processes.ts src/modules/processes/actions.ts
cp -r src/components/processes/* src/modules/processes/components/
rm -rf src/components/processes
```

Note: use `cp -r` then `rm -rf` because of the `nodes/` subdirectory.

- [ ] **Step 2: Update all imports**

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/processes" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/processes/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move processes module to src/modules/processes"
```

---

### Task 7: Move versions module

**Files:**
- Create: `src/modules/versions/actions.ts` (move from `src/actions/revisions.ts`)
- Create: `src/modules/versions/lib.ts` (move from `src/lib/revisions.ts`)
- Create: `src/modules/versions/components/` (move from `src/components/revisions/`)
- Modify: version pages, generate route, generation components that import from these paths

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/versions/components
mv src/actions/revisions.ts src/modules/versions/actions.ts
mv src/lib/revisions.ts src/modules/versions/lib.ts
mv src/components/revisions/* src/modules/versions/components/
rmdir src/components/revisions
```

- [ ] **Step 2: Update all imports**

Key files to update:
- `src/app/(dashboard)/project/[id]/revisions/page.tsx` - imports revisions-list
- `src/app/(dashboard)/project/[id]/revisions/[revisionId]/page.tsx` - imports revision-editor and lib
- `src/app/api/generate/route.ts` - imports `VersionSnapshot` from lib
- Generation components that import `VersionSnapshot`

Update paths:
- `@/actions/revisions` to `@/modules/versions/actions`
- `@/lib/revisions` to `@/modules/versions/lib`
- `@/components/revisions/` to `@/modules/versions/components/`

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/revisions" src/ --include="*.ts" --include="*.tsx"
grep -r "@/lib/revisions" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/revisions/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move versions module to src/modules/versions"
```

---

### Task 8: Move generation module

**Files:**
- Create: `src/modules/generation/actions.ts` (move from `src/actions/generation.ts`)
- Create: `src/modules/generation/lib/generate.ts` (move from `src/lib/generation/generate.ts`)
- Create: `src/modules/generation/lib/prompts.ts` (move from `src/lib/generation/prompts.ts`)
- Create: `src/modules/generation/components/` (move from `src/components/generate/`)
- Modify: `src/app/api/generate/route.ts`, `src/app/(dashboard)/project/[id]/generate/page.tsx`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/generation/components
mkdir -p src/modules/generation/lib
mv src/actions/generation.ts src/modules/generation/actions.ts
mv src/lib/generation/generate.ts src/modules/generation/lib/generate.ts
mv src/lib/generation/prompts.ts src/modules/generation/lib/prompts.ts
rmdir src/lib/generation
mv src/components/generate/* src/modules/generation/components/
rmdir src/components/generate
```

- [ ] **Step 2: Update all imports**

Update paths:
- `@/actions/generation` to `@/modules/generation/actions`
- `@/lib/generation/generate` to `@/modules/generation/lib/generate`
- `@/lib/generation/prompts` to `@/modules/generation/lib/prompts`
- `@/components/generate/` to `@/modules/generation/components/`

Key files: API route, generate page, generation components referencing each other, process flow generate dialog.

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/actions/generation" src/ --include="*.ts" --include="*.tsx"
grep -r "@/lib/generation/" src/ --include="*.ts" --include="*.tsx"
grep -r "@/components/generate/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move generation module to src/modules/generation"
```

---

### Task 9: Move outputs module

**Files:**
- Create: `src/modules/outputs/components/output-item.tsx` (move from `src/components/outputs/output-item.tsx`)
- Modify: `src/app/(dashboard)/project/[id]/outputs/page.tsx`

- [ ] **Step 1: Create directories and move files**

```bash
mkdir -p src/modules/outputs/components
mv src/components/outputs/* src/modules/outputs/components/
rmdir src/components/outputs
```

- [ ] **Step 2: Update imports**

- [ ] **Step 3: Search and fix remaining references**

```bash
grep -r "@/components/outputs/" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move outputs module to src/modules/outputs"
```

---

### Task 10: Clean up empty directories and final verification

**Files:**
- Delete: `src/actions/` (should be empty)
- Delete: any empty `src/components/` subdirectories
- Verify: `src/components/` only contains `ui/`, `layout/`, and `providers.tsx`

- [ ] **Step 1: Remove empty directories**

```bash
rmdir src/actions 2>/dev/null
# Verify remaining structure
find src/components -type d | sort
find src/modules -type d | sort
```

Expected `src/components/`:
```
src/components
src/components/layout
src/components/ui
```

- [ ] **Step 2: Full build verification**

```bash
npm run build
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

- [ ] **Step 4: Commit any final cleanup**

```bash
git add -A
git commit -m "chore: clean up empty directories after modular restructure"
```
