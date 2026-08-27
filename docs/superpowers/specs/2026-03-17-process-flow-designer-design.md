# Process Flow Designer - Design Specification

> **Historical record.** This plan has already shipped. Do not implement it.
> It predates the modular restructure, so the paths below are out of date
> (`src/actions/` and `src/lib/generation/` are now `src/modules/`).
> See [docs/superpowers/README.md](../README.md) for context.

## Overview

Add the ability to describe and edit business processes as flowcharts within the Enterprise Requirements Platform. Users can document both current-state ("as-is") and future-state ("to-be") process flows using a visual editor powered by Xyflow (React Flow). The AI can generate initial flows from project context and the flows feed back into AI document generation as additional context.

## Requirements Summary

- **Both as-is and to-be flows** per project, tagged by type
- **Multiple named flows** per project (e.g. "Order Processing", "User Onboarding")
- **Wizard step** (optional Step 7) for guided initial capture, plus a dedicated **Processes tab** for freeform editing
- **Standard flowchart nodes**: process, decision, start/end, subprocess (not full BPMN)
- **AI integration**: generate flows from project context, and feed flow data into existing document generation
- **Requirements linking**: nice-to-have for a future version, not in v1

## Library Choice

**@xyflow/react** (React Flow v12+) -- mature, well-maintained flowchart library with custom nodes, edges, minimap, zoom/pan, and TypeScript support. Paired with **dagre** for auto-layout of AI-generated flows.

## Data Model

### New Enum

```prisma
enum FlowType {
  as_is
  to_be
}
```

### New Model: ProcessFlow

```prisma
model ProcessFlow {
  id          String   @id @default(uuid())
  projectId   String
  name        String
  description String   @default("")
  flowType    FlowType
  diagramData Json     @default("{}")
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

The `diagramData` JSON field stores the complete Xyflow serialized state. Default is `{}` at the database level; the application initializes it to `{nodes: [], edges: []}` when creating a new flow. This avoids normalizing nodes and edges into separate database tables, which would add complexity without benefit since the data is always loaded and saved as a unit.

The `Project` model must also gain a `processFlows ProcessFlow[]` reverse relation field.

### Node Schema (within diagramData JSON)

Each node carries:
- `id`: string
- `type`: `process` | `decision` | `start_end` | `subprocess`
- `position`: `{ x: number, y: number }`
- `data`: `{ label: string }` (extensible for future metadata)

### Edge Schema (within diagramData JSON)

Each edge carries:
- `id`: string
- `source`: node id
- `target`: node id
- `sourceHandle`: string (optional, for decision nodes: "yes"/"no")
- `targetHandle`: string (optional)
- `label`: string (optional, e.g. "yes", "no")

## Wizard Integration

The wizard gains a new optional **Step 7: "Process Flows"**, pushing the current Review step to Step 8.

### Behavior

- Step is optional and can be skipped
- "Add Process Flow" button creates a new flow with name, type (as-is/to-be), and opens the Xyflow canvas
- "Generate from project context" button asks Claude to produce initial nodes/edges from vision, objectives, and user stories
- Multiple flows can be created within the step (limit of 5 in wizard, unlimited in freeform)
- Each flow shows as a collapsible card with thumbnail preview and type badge

### Server Action

`saveProcessFlows` in `wizard.ts` using the existing bulk save pattern (delete and recreate). This is acceptable because flow IDs are not externally referenced in v1. All hardcoded step-7 references in `finalizeWizard()` and `WizardShell` max-step logic must be updated to step 8.

## Processes Tab

New top-level project tab at `/project/[id]/processes`, positioned between Requirements and Generate in the navigation.

### Page Layout

- **Left panel**: list of flows with name, type badge (as-is/to-be), drag-to-reorder via dnd-kit
- **Right panel**: Xyflow canvas for the selected flow
- **Top bar**: editable flow name, type toggle (as-is/to-be), "AI Generate" button, delete button

### Canvas Features

- Node palette/toolbar for dragging to add process, decision, start/end, subprocess nodes
- Click node to edit label inline
- Connect nodes by dragging from handles
- Xyflow built-ins: minimap, zoom controls, snap-to-grid
- Auto-save on change via debounced server action (same pattern as meta editor)

### Custom Node Components

Four node types, styled to match the shadcn/ui design system:

- **ProcessNode**: rounded rectangle with neutral border
- **DecisionNode**: diamond shape with yes/no output handles
- **StartEndNode**: pill/oval shape
- **SubprocessNode**: double-bordered rectangle

## AI Integration

### AI-to-Flowchart (Generation)

- New prompt builder in `src/lib/generation/prompts.ts` that takes project context (vision, objectives, user stories, existing flows) and asks Claude to return structured JSON with `nodes[]` and `edges[]`
- Prompt instructs Claude to use standard flowchart shapes, descriptive labels, and logical connections
- Response parsed and loaded directly into Xyflow
- Auto-layout via `dagre` to position nodes cleanly (avoids overlap from raw AI output)
- Available in both wizard step and Processes tab

### Flowchart-to-AI (Feeding Document Generation)

- Extend existing system/user prompts for all 4 output types (ai_prompt, requirements_doc, project_brief, technical_spec)
- Serialize flows into readable text: flow name, type, and step-by-step description (node labels + connections in natural language)
- Added to prompts alongside vision, objectives, stories, and NFRs
- No changes to streaming API route, just richer prompt content

## File Structure

### New Files

```
src/
  app/(dashboard)/project/[id]/processes/
    page.tsx                          # Server component, data fetch
  components/
    processes/
      processes-client.tsx            # Main client component (list + canvas)
      flow-canvas.tsx                 # Xyflow canvas wrapper
      flow-list.tsx                   # Left panel flow list with reorder
      flow-toolbar.tsx                # Node palette (drag to add)
      nodes/
        process-node.tsx              # Rectangular process step
        decision-node.tsx             # Diamond decision
        start-end-node.tsx            # Oval start/end
        subprocess-node.tsx           # Double-bordered subprocess
      generate-flow-dialog.tsx        # AI generation trigger + loading
    wizard/
      step-process-flows.tsx          # New wizard step
  actions/
    processes.ts                      # CRUD + diagram save server actions
```

### Modified Files

- `prisma/schema.prisma` -- add ProcessFlow model, FlowType enum, relation on Project
- `src/components/layout/project-tabs.tsx` -- add "Processes" tab
- `src/components/wizard/wizard-shell.tsx` -- add step 7, shift Review to step 8
- `src/components/wizard/wizard-client.tsx` -- wire up new step component
- `src/actions/wizard.ts` -- add saveProcessFlows action, update finalizeWizard step references from 7 to 8
- `src/lib/generation/prompts.ts` -- add flow generation prompt, extend existing output prompts with flow data
- `src/lib/generation/generate.ts` -- add non-streaming generation for structured JSON (flow generation)

## New Dependencies

- `@xyflow/react` -- flowchart editor core
- `dagre` -- directed graph layout for auto-positioning AI-generated nodes
- `@types/dagre` -- TypeScript types for dagre

## Server Actions (src/actions/processes.ts)

- `createProcessFlow(projectId, name, flowType)` -- create new flow
- `updateProcessFlow(id, data)` -- update name, description, type
- `updateDiagramData(id, projectId, diagramData)` -- save Xyflow JSON (called on debounced auto-save). Accepts projectId alongside id for simpler permission checks (flow -> project -> org lookup)
- `deleteProcessFlow(id, projectId)` -- delete a flow. Accepts projectId for permission checks
- `reorderProcessFlows(projectId, orderedIds)` -- update sort order

All actions check permissions via `requireSession()` and `requireOrgMembership()`.

## Future Considerations (Not in v1)

- Link flowchart nodes to existing requirements (objectives, user stories, NFRs) for traceability
- Flow versioning/history
- Collaborative editing
- Export flows as standalone images (SVG/PNG)
- BPMN-style features (swimlanes, parallel gateways)
