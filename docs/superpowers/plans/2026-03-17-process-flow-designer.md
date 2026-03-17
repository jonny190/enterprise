# Process Flow Designer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual business process flowchart editing to the Enterprise Requirements Platform using @xyflow/react, integrated into both the wizard and a dedicated Processes tab, with AI generation and document generation context.

**Architecture:** New `ProcessFlow` Prisma model stores flowchart data as JSON. Xyflow canvas renders/edits flows. Wizard gets optional Step 7 for guided capture, freeform Processes tab for ongoing editing. AI generates initial flows and consumes flow data in document generation prompts.

**Tech Stack:** @xyflow/react, dagre (auto-layout), Prisma 7, Next.js 16 Server Actions, shadcn/ui, dnd-kit

**Spec:** `docs/superpowers/specs/2026-03-17-process-flow-designer-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/actions/processes.ts` | Server actions: CRUD, diagram save, reorder |
| `src/app/(dashboard)/project/[id]/processes/page.tsx` | Processes page (server component, data fetch) |
| `src/components/processes/processes-client.tsx` | Main client: flow list + canvas layout |
| `src/components/processes/flow-canvas.tsx` | Xyflow canvas wrapper with node types, toolbar, minimap |
| `src/components/processes/flow-list.tsx` | Left panel: sortable flow list with add/delete |
| `src/components/processes/flow-toolbar.tsx` | Draggable node palette (process, decision, start/end, subprocess) |
| `src/components/processes/nodes/process-node.tsx` | Rounded rectangle node |
| `src/components/processes/nodes/decision-node.tsx` | Diamond node with yes/no handles |
| `src/components/processes/nodes/start-end-node.tsx` | Oval/pill node |
| `src/components/processes/nodes/subprocess-node.tsx` | Double-bordered rectangle node |
| `src/components/processes/generate-flow-dialog.tsx` | AI flow generation dialog with loading state |
| `src/components/wizard/step-process-flows.tsx` | Wizard Step 7: optional process flow capture |
| `src/app/api/generate-flow/route.ts` | API route for AI flow generation with dagre layout |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `FlowType` enum, `ProcessFlow` model, `processFlows` relation on `Project` |
| `src/components/layout/project-tabs.tsx` | Add "Processes" tab between Requirements and Generate |
| `src/components/wizard/wizard-shell.tsx` | Add Step 7 "Process Flows" to STEPS, update max step 7 -> 8 |
| `src/components/wizard/wizard-client.tsx` | Add case 7 for step-process-flows component, shift Review to case 8, add processFlows prop |
| `src/app/(dashboard)/project/[id]/wizard/page.tsx` | Include processFlows in project query, pass as prop to WizardClient |
| `src/actions/wizard.ts` | Add `saveProcessFlows` action, update `finalizeWizard` step refs 7 -> 8 |
| `src/lib/generation/prompts.ts` | Add flow generation prompt, extend `buildUserPrompt` with flow data |
| `src/lib/generation/generate.ts` | Add `generateFlowDiagram` for structured JSON (non-streaming) |
| `src/app/api/generate/route.ts` | Include processFlows in project data fetch |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @xyflow/react and dagre**

```bash
npm install @xyflow/react dagre @types/dagre
```

- [ ] **Step 2: Verify install succeeded**

```bash
npm ls @xyflow/react dagre
```

Expected: Shows installed versions, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react and dagre dependencies"
```

---

## Task 2: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add FlowType enum and ProcessFlow model to schema**

Add after the `OutputType` enum (around line 205):

```prisma
enum FlowType {
  as_is
  to_be
}

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

- [ ] **Step 2: Add processFlows relation to Project model**

In the `Project` model (around line 106), add after `generatedOutputs`:

```prisma
  processFlows ProcessFlow[]
```

- [ ] **Step 3: Generate migration and apply**

```bash
npx prisma migrate dev --name add-process-flows
```

Expected: Migration created and applied, Prisma client regenerated.

- [ ] **Step 4: Verify Prisma client**

```bash
npx prisma generate
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add ProcessFlow model and FlowType enum to schema"
```

---

## Task 3: Server Actions

**Files:**
- Create: `src/actions/processes.ts`

- [ ] **Step 1: Create processes.ts with all CRUD actions**

Follow the pattern from `src/actions/requirements.ts` (add/update/delete/reorder) and `src/actions/wizard.ts` (getProjectWithAuth helper).

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { FlowType } from "@prisma/client";

async function getProjectWithAuth(projectId: string) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);
  return project;
}

export async function createProcessFlow(
  projectId: string,
  name: string,
  flowType: FlowType
) {
  await getProjectWithAuth(projectId);
  const count = await prisma.processFlow.count({ where: { projectId } });
  const flow = await prisma.processFlow.create({
    data: {
      projectId,
      name,
      flowType,
      diagramData: { nodes: [], edges: [] },
      sortOrder: count,
    },
  });
  revalidatePath(`/project/${projectId}`);
  return flow;
}

export async function updateProcessFlow(
  id: string,
  projectId: string,
  data: { name?: string; description?: string; flowType?: FlowType }
) {
  await getProjectWithAuth(projectId);
  await prisma.processFlow.update({ where: { id }, data });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function updateDiagramData(
  id: string,
  projectId: string,
  diagramData: { nodes: unknown[]; edges: unknown[] }
) {
  await getProjectWithAuth(projectId);
  await prisma.processFlow.update({
    where: { id },
    data: { diagramData },
  });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function deleteProcessFlow(id: string, projectId: string) {
  await getProjectWithAuth(projectId);
  await prisma.processFlow.delete({ where: { id } });
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function reorderProcessFlows(
  projectId: string,
  orderedIds: string[]
) {
  await getProjectWithAuth(projectId);
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.processFlow.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/actions/processes.ts 2>&1 || npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/processes.ts
git commit -m "feat: add process flow server actions (CRUD, reorder)"
```

---

## Task 4: Custom Xyflow Node Components

**Files:**
- Create: `src/components/processes/nodes/process-node.tsx`
- Create: `src/components/processes/nodes/decision-node.tsx`
- Create: `src/components/processes/nodes/start-end-node.tsx`
- Create: `src/components/processes/nodes/subprocess-node.tsx`

- [ ] **Step 1: Create ProcessNode**

```tsx
"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

type ProcessNodeData = { label: string; onLabelChange?: (label: string) => void };

export function ProcessNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProcessNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (nodeData.onLabelChange) nodeData.onLabelChange(label);
  };

  return (
    <div
      className={`rounded-lg border-2 bg-white px-4 py-2 min-w-[120px] text-center shadow-sm ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      {editing ? (
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className="w-full bg-transparent text-center text-sm outline-none"
        />
      ) : (
        <span className="text-sm">{label}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
```

- [ ] **Step 2: Create DecisionNode**

```tsx
"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

type DecisionNodeData = { label: string; onLabelChange?: (label: string) => void };

export function DecisionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DecisionNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (nodeData.onLabelChange) nodeData.onLabelChange(label);
  };

  return (
    <div
      className={`flex items-center justify-center min-w-[100px] min-h-[100px] ${
        selected ? "[&>div]:border-blue-500" : ""
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div
        className={`rotate-45 border-2 bg-white shadow-sm ${
          selected ? "border-blue-500" : "border-amber-400"
        }`}
        style={{ width: 80, height: 80 }}
      >
        <div className="-rotate-45 flex items-center justify-center w-full h-full p-2">
          {editing ? (
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleBlur()}
              className="w-full bg-transparent text-center text-xs outline-none"
            />
          ) : (
            <span className="text-xs text-center">{label}</span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!bg-red-500"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create StartEndNode**

```tsx
"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

type StartEndNodeData = { label: string; onLabelChange?: (label: string) => void };

export function StartEndNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as StartEndNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (nodeData.onLabelChange) nodeData.onLabelChange(label);
  };

  return (
    <div
      className={`rounded-full border-2 bg-white px-6 py-2 min-w-[80px] text-center shadow-sm ${
        selected ? "border-blue-500" : "border-green-500"
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      {editing ? (
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className="w-full bg-transparent text-center text-sm outline-none"
        />
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
```

- [ ] **Step 4: Create SubprocessNode**

```tsx
"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

type SubprocessNodeData = { label: string; onLabelChange?: (label: string) => void };

export function SubprocessNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SubprocessNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (nodeData.onLabelChange) nodeData.onLabelChange(label);
  };

  return (
    <div
      className={`rounded-lg border-2 bg-white px-4 py-2 min-w-[120px] text-center shadow-sm ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="border-l-2 border-r-2 border-gray-300 px-2 -mx-2">
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBlur()}
            className="w-full bg-transparent text-center text-sm outline-none"
          />
        ) : (
          <span className="text-sm">{label}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/processes/nodes/
git commit -m "feat: add custom Xyflow node components (process, decision, start/end, subprocess)"
```

---

## Task 5: Flow Toolbar (Node Palette)

**Files:**
- Create: `src/components/processes/flow-toolbar.tsx`

- [ ] **Step 1: Create the draggable node palette**

```tsx
"use client";

import { type DragEvent } from "react";
import { Square, Diamond, Circle, Layers } from "lucide-react";

const nodeTypes = [
  { type: "process", label: "Process", icon: Square },
  { type: "decision", label: "Decision", icon: Diamond },
  { type: "start_end", label: "Start/End", icon: Circle },
  { type: "subprocess", label: "Subprocess", icon: Layers },
];

export function FlowToolbar() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex gap-2 rounded-lg border bg-white p-2 shadow-sm">
      {nodeTypes.map(({ type, label, icon: Icon }) => (
        <div
          key={type}
          className="flex cursor-grab items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 active:cursor-grabbing"
          draggable
          onDragStart={(e) => onDragStart(e, type)}
        >
          <Icon className="h-4 w-4 text-gray-500" />
          {label}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processes/flow-toolbar.tsx
git commit -m "feat: add flow toolbar with draggable node palette"
```

---

## Task 6: Flow Canvas

**Files:**
- Create: `src/components/processes/flow-canvas.tsx`

- [ ] **Step 1: Create the Xyflow canvas wrapper**

This is the main canvas component. It registers custom node types, handles drag-and-drop from the toolbar, and auto-saves diagram changes.

```tsx
"use client";

import { useCallback, useRef, useMemo, useEffect, type DragEvent } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ProcessNode } from "./nodes/process-node";
import { DecisionNode } from "./nodes/decision-node";
import { StartEndNode } from "./nodes/start-end-node";
import { SubprocessNode } from "./nodes/subprocess-node";
import { FlowToolbar } from "./flow-toolbar";
import { updateDiagramData } from "@/actions/processes";

type FlowCanvasProps = {
  flowId: string;
  projectId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
};

export function FlowCanvas({
  flowId,
  projectId,
  initialNodes,
  initialEdges,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // Keep refs in sync for debounced save
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const nodeTypes = useMemo(
    () => ({
      process: ProcessNode,
      decision: DecisionNode,
      start_end: StartEndNode,
      subprocess: SubprocessNode,
    }),
    []
  );

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateDiagramData(flowId, projectId, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });
    }, 1000);
  }, [flowId, projectId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      debouncedSave();
    },
    [setEdges, debouncedSave]
  );

  // Auto-save when nodes or edges change
  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      debouncedSave();
    },
    [onNodesChange, debouncedSave]
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      debouncedSave();
    },
    [onEdgesChange, debouncedSave]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      // Use screenToFlowPosition for correct coordinates with zoom/pan
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: type === "start_end" ? "Start" : "New Step" },
      };

      setNodes((nds) => [...nds, newNode]);
      debouncedSave();
    },
    [setNodes, screenToFlowPosition, debouncedSave]
  );

  const onNodeLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
        );
        debouncedSave(updated, edges);
        return updated;
      });
    },
    [setNodes, edges, debouncedSave]
  );

  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onLabelChange: (label: string) => onNodeLabelChange(n.id, label),
        },
      })),
    [nodes, onNodeLabelChange]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <FlowToolbar />
      </div>
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          snapToGrid
          snapGrid={[15, 15]}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={15} />
        </ReactFlow>
      </div>
    </div>
  );
}

export function FlowCanvasWithProvider(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processes/flow-canvas.tsx
git commit -m "feat: add Xyflow canvas with custom nodes, drag-drop, auto-save"
```

---

## Task 7: Flow List Component

**Files:**
- Create: `src/components/processes/flow-list.tsx`

- [ ] **Step 1: Create the sortable flow list panel with dnd-kit reordering**

Note: `@dnd-kit/core` and `@dnd-kit/sortable` are already installed in the project. Use them for drag-to-reorder, following the same pattern as `src/components/requirements/sortable-list.tsx`.

```tsx
"use client";

import { useState } from "react";
import { type FlowType } from "@prisma/client";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  createProcessFlow,
  deleteProcessFlow,
  reorderProcessFlows,
} from "@/actions/processes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Flow = {
  id: string;
  name: string;
  flowType: FlowType;
};

type FlowListProps = {
  projectId: string;
  flows: Flow[];
  selectedFlowId: string | null;
  onSelectFlow: (id: string) => void;
};

export function FlowList({
  projectId,
  flows,
  selectedFlowId,
  onSelectFlow,
}: FlowListProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FlowType>("as_is");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const flow = await createProcessFlow(projectId, newName.trim(), newType);
    setNewName("");
    setAdding(false);
    onSelectFlow(flow.id);
  };

  const handleDelete = async (id: string) => {
    await deleteProcessFlow(id, projectId);
  };

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-medium">Process Flows</h3>
        <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {adding && (
        <div className="space-y-2 border-b p-3">
          <Input
            placeholder="Flow name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as FlowType)}
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="as_is">As-Is</option>
            <option value="to_be">To-Be</option>
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className={`flex cursor-pointer items-center justify-between border-b px-3 py-2 hover:bg-gray-50 ${
              selectedFlowId === flow.id ? "bg-gray-100" : ""
            }`}
            onClick={() => onSelectFlow(flow.id)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-300" />
              <div>
                <div className="text-sm font-medium">{flow.name}</div>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {flow.flowType === "as_is" ? "As-Is" : "To-Be"}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(flow.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </div>
        ))}

        {flows.length === 0 && !adding && (
          <div className="p-4 text-center text-sm text-gray-400">
            No process flows yet. Click + to add one.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processes/flow-list.tsx
git commit -m "feat: add flow list panel with add, delete, and selection"
```

---

## Task 8: Processes Client (Main Layout)

**Files:**
- Create: `src/components/processes/processes-client.tsx`

- [ ] **Step 1: Create the main processes client component**

Combines FlowList and FlowCanvas in a split layout.

```tsx
"use client";

import { useState } from "react";
import { type FlowType } from "@prisma/client";
import { type Node, type Edge } from "@xyflow/react";
import { FlowList } from "./flow-list";
import { FlowCanvasWithProvider } from "./flow-canvas";

type ProcessFlow = {
  id: string;
  name: string;
  description: string;
  flowType: FlowType;
  diagramData: { nodes: Node[]; edges: Edge[] };
};

type ProcessesClientProps = {
  projectId: string;
  flows: ProcessFlow[];
};

export function ProcessesClient({ projectId, flows }: ProcessesClientProps) {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(
    flows[0]?.id ?? null
  );

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="w-64 shrink-0">
        <FlowList
          projectId={projectId}
          flows={flows}
          selectedFlowId={selectedFlowId}
          onSelectFlow={setSelectedFlowId}
        />
      </div>
      <div className="flex-1">
        {selectedFlow ? (
          <FlowCanvasWithProvider
            key={selectedFlow.id}
            flowId={selectedFlow.id}
            projectId={projectId}
            initialNodes={selectedFlow.diagramData.nodes ?? []}
            initialEdges={selectedFlow.diagramData.edges ?? []}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select or create a process flow to get started.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processes/processes-client.tsx
git commit -m "feat: add processes client with split list/canvas layout"
```

---

## Task 9: Processes Page + Tab Navigation

**Files:**
- Create: `src/app/(dashboard)/project/[id]/processes/page.tsx`
- Modify: `src/components/layout/project-tabs.tsx`

- [ ] **Step 1: Create the processes page (server component)**

Follow the pattern from `src/app/(dashboard)/project/[id]/requirements/page.tsx`.

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessesClient } from "@/components/processes/processes-client";

export default async function ProcessesPage({
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
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  const flows = project.processFlows.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    flowType: f.flowType,
    diagramData: (f.diagramData as { nodes: []; edges: [] }) ?? {
      nodes: [],
      edges: [],
    },
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Process Flows</h1>
      <ProcessesClient projectId={id} flows={flows} />
    </div>
  );
}
```

- [ ] **Step 2: Add Processes tab to project-tabs.tsx**

In `src/components/layout/project-tabs.tsx`, add "Processes" between "Requirements" and "Generate" in the tabs array:

```typescript
const tabs = [
  { label: "Wizard", href: "wizard" },
  { label: "Requirements", href: "requirements" },
  { label: "Meta", href: "meta" },
  { label: "Processes", href: "processes" },
  { label: "Generate", href: "generate" },
  { label: "Outputs", href: "outputs" },
  { label: "Settings", href: "settings" },
];
```

- [ ] **Step 3: Verify the page builds**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/project/\[id\]/processes/ src/components/layout/project-tabs.tsx
git commit -m "feat: add processes page and tab navigation"
```

---

## Task 10: Wizard Integration

**Files:**
- Create: `src/components/wizard/step-process-flows.tsx`
- Modify: `src/components/wizard/wizard-shell.tsx`
- Modify: `src/components/wizard/wizard-client.tsx`
- Modify: `src/actions/wizard.ts`

- [ ] **Step 1: Add saveProcessFlows to wizard.ts**

Add this action to `src/actions/wizard.ts`, following the `saveConstraints` pattern:

```typescript
export async function saveProcessFlows(
  projectId: string,
  flows: { name: string; flowType: FlowType; diagramData: { nodes: unknown[]; edges: unknown[] } }[]
) {
  await getProjectWithAuth(projectId);

  await prisma.processFlow.deleteMany({ where: { projectId } });

  if (flows.length > 0) {
    await prisma.$transaction(
      flows.map((flow, index) =>
        prisma.processFlow.create({
          data: {
            projectId,
            name: flow.name,
            flowType: flow.flowType,
            diagramData: flow.diagramData,
            sortOrder: index,
          },
        })
      )
    );
  }

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
```

Also add `FlowType` to the Prisma imports at the top of the file.

- [ ] **Step 2: Update finalizeWizard step references**

In `src/actions/wizard.ts`, update `finalizeWizard` to change `currentStep: 7` to `currentStep: 8` and `completedSteps: [1, 2, 3, 4, 5, 6, 7]` to `completedSteps: [1, 2, 3, 4, 5, 6, 7, 8]`.

- [ ] **Step 3: Update wizard-shell.tsx STEPS and max step**

In `src/components/wizard/wizard-shell.tsx`:
- Add `{ number: 7, label: "Process Flows" }` to the STEPS array before Review
- Change Review to `{ number: 8, label: "Review & Finalize" }`
- Change `Math.min(step + 1, 7)` to `Math.min(step + 1, 8)`

- [ ] **Step 4: Create step-process-flows.tsx**

Follow the pattern from `step-objectives.tsx`. This is a simplified wizard step where users can add named flows and optionally open a mini canvas.

```tsx
"use client";

import { useState } from "react";
import { type FlowType } from "@prisma/client";
import { saveProcessFlows } from "@/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

type FlowItem = {
  name: string;
  flowType: FlowType;
  diagramData: { nodes: unknown[]; edges: unknown[] };
};

type Props = {
  projectId: string;
  initialFlows: FlowItem[];
  onComplete: () => void;
};

export function StepProcessFlows({
  projectId,
  initialFlows,
  onComplete,
}: Props) {
  const [flows, setFlows] = useState<FlowItem[]>(
    initialFlows.length > 0 ? initialFlows : []
  );
  const [saving, setSaving] = useState(false);

  const addFlow = () => {
    if (flows.length >= 5) return;
    setFlows([
      ...flows,
      { name: "", flowType: "as_is", diagramData: { nodes: [], edges: [] } },
    ]);
  };

  const removeFlow = (index: number) => {
    setFlows(flows.filter((_, i) => i !== index));
  };

  const updateFlow = (index: number, field: keyof FlowItem, value: string) => {
    setFlows(
      flows.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    const valid = flows.filter((f) => f.name.trim());
    await saveProcessFlows(projectId, valid);
    setSaving(false);
    onComplete();
  };

  const canAdd = flows.length < 5;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Process Flows</h2>
        <p className="text-sm text-gray-500">
          Optionally describe key business processes. You can add detailed
          flowcharts later from the Processes tab. Skip this step if not needed.
        </p>
      </div>

      {flows.map((flow, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Flow {index + 1}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeFlow(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Flow name (e.g. Order Processing)"
            value={flow.name}
            onChange={(e) => updateFlow(index, "name", e.target.value)}
          />
          <select
            value={flow.flowType}
            onChange={(e) =>
              updateFlow(index, "flowType", e.target.value)
            }
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="as_is">As-Is (Current Process)</option>
            <option value="to_be">To-Be (Future Process)</option>
          </select>
        </div>
      ))}

      <div className="flex gap-3">
        {canAdd && (
          <Button variant="outline" onClick={addFlow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Process Flow
          </Button>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : flows.length > 0 ? "Save & Continue" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update wizard page to fetch and pass processFlows**

In `src/app/(dashboard)/project/[id]/wizard/page.tsx`:
- Add `processFlows: { orderBy: { sortOrder: "asc" } }` to the Prisma `include` in the project query
- Pass `processFlows={project.processFlows}` as a prop to `WizardClient`

- [ ] **Step 6: Wire up wizard-client.tsx**

In `src/components/wizard/wizard-client.tsx`:
- Import `{ StepProcessFlows }` from `./step-process-flows`
- Add `processFlows` to the `Props` type (matching the Prisma ProcessFlow type)
- Shift the current case 7 (Review) to case 8
- Add new case 7 for StepProcessFlows:

```typescript
case 7:
  return (
    <StepProcessFlows
      projectId={projectId}
      initialFlows={
        processFlows?.map((f) => ({
          name: f.name,
          flowType: f.flowType,
          diagramData: (f.diagramData as { nodes: unknown[]; edges: unknown[] }) ?? { nodes: [], edges: [] },
        })) ?? []
      }
      onComplete={onComplete}
    />
  );
```

- [ ] **Step 7: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 8: Commit**

```bash
git add src/components/wizard/ src/actions/wizard.ts src/app/\(dashboard\)/project/\[id\]/wizard/
git commit -m "feat: add process flows as wizard step 7, shift review to step 8"
```

---

## Task 11: AI Flow Generation

**Files:**
- Create: `src/components/processes/generate-flow-dialog.tsx`
- Modify: `src/lib/generation/generate.ts`
- Modify: `src/lib/generation/prompts.ts`

- [ ] **Step 1: Add flow generation prompt to prompts.ts**

Add a new function to `src/lib/generation/prompts.ts`:

```typescript
export function buildFlowGenerationPrompt(projectData: {
  name: string;
  description: string;
  meta: { visionStatement: string; businessContext: string; targetUsers: string };
  objectives: { title: string; successCriteria: string }[];
  userStories: { role: string; capability: string; benefit: string }[];
}) {
  let prompt = `Based on the following project context, generate a business process flowchart.\n\n`;
  prompt += `## Project: ${projectData.name}\n${projectData.description}\n\n`;
  if (projectData.meta.visionStatement)
    prompt += `## Vision\n${projectData.meta.visionStatement}\n\n`;
  if (projectData.meta.businessContext)
    prompt += `## Business Context\n${projectData.meta.businessContext}\n\n`;
  if (projectData.objectives.length > 0) {
    prompt += `## Objectives\n`;
    projectData.objectives.forEach((o) => {
      prompt += `- ${o.title}${o.successCriteria ? ` (Success: ${o.successCriteria})` : ""}\n`;
    });
    prompt += "\n";
  }
  if (projectData.userStories.length > 0) {
    prompt += `## User Stories\n`;
    projectData.userStories.forEach((s) => {
      prompt += `- As a ${s.role}, I want ${s.capability}, so that ${s.benefit}\n`;
    });
    prompt += "\n";
  }
  prompt += `Return a JSON object with "nodes" and "edges" arrays for a flowchart.\n`;
  prompt += `Each node: { "id": "string", "type": "process"|"decision"|"start_end"|"subprocess", "data": { "label": "string" } }\n`;
  prompt += `Each edge: { "id": "string", "source": "node_id", "target": "node_id", "label": "optional string for decision branches" }\n`;
  prompt += `Use "start_end" type for the Start and End nodes. Use "decision" for yes/no branches. Use "process" for action steps.\n`;
  prompt += `Do not include position data -- positions will be auto-calculated.\n`;
  prompt += `Return ONLY the JSON object, no markdown fences or other text.`;
  return prompt;
}
```

- [ ] **Step 2: Add non-streaming generation function to generate.ts**

Add to `src/lib/generation/generate.ts`:

```typescript
export async function generateStructuredJSON(prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: "You are a business process analyst. Return only valid JSON with no markdown fences or additional text.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  return textBlock?.text ?? "{}";
}
```

- [ ] **Step 3: Add flow serializer for document generation prompts**

Add to `src/lib/generation/prompts.ts`, inside the existing `buildUserPrompt` function. Extend the function signature to accept an optional `processFlows` parameter and append flow descriptions to the prompt:

```typescript
// Add to the projectData type:
processFlows?: { name: string; flowType: string; diagramData: { nodes: { id: string; type: string; data: { label: string } }[]; edges: { source: string; target: string; label?: string }[] } }[];

// Add this section at the end of buildUserPrompt, before the return:
if (projectData.processFlows && projectData.processFlows.length > 0) {
  prompt += `\n## Business Process Flows\n\n`;
  projectData.processFlows.forEach((flow) => {
    prompt += `### ${flow.name} (${flow.flowType === "as_is" ? "Current State" : "Future State"})\n`;
    const nodeMap = new Map(flow.diagramData.nodes.map((n) => [n.id, n.data.label]));
    flow.diagramData.edges.forEach((edge) => {
      const from = nodeMap.get(edge.source) ?? edge.source;
      const to = nodeMap.get(edge.target) ?? edge.target;
      prompt += `- ${from} -> ${to}${edge.label ? ` [${edge.label}]` : ""}\n`;
    });
    prompt += "\n";
  });
}
```

- [ ] **Step 4: Create generate-flow-dialog.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

type GenerateFlowDialogProps = {
  projectId: string;
  onGenerated: (diagramData: { nodes: unknown[]; edges: unknown[] }) => void;
};

export function GenerateFlowButton({
  projectId,
  onGenerated,
}: GenerateFlowDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/generate-flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.nodes && data.edges) {
        onGenerated(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {loading ? "Generating..." : "AI Generate"}
    </Button>
  );
}
```

- [ ] **Step 5: Wire GenerateFlowButton into processes-client.tsx**

In `src/components/processes/processes-client.tsx`, import `GenerateFlowButton` and render it above the canvas when a flow is selected. When `onGenerated` fires, update the selected flow's nodes/edges by setting them on the `FlowCanvasWithProvider` via a key change to force re-render with new initial data.

Add a `handleFlowGenerated` callback that calls `updateDiagramData` to persist the AI-generated diagram, then triggers a page refresh via `router.refresh()`.

- [ ] **Step 6: Commit**

```bash
git add src/components/processes/generate-flow-dialog.tsx src/components/processes/processes-client.tsx src/lib/generation/
git commit -m "feat: add AI flow generation prompts and generate button"
```

---

## Task 12: AI Flow Generation API Route

**Files:**
- Create: `src/app/api/generate-flow/route.ts`
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Create the generate-flow API route**

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buildFlowGenerationPrompt } from "@/lib/generation/prompts";
import { generateStructuredJSON } from "@/lib/generation/generate";
import dagre from "dagre";

function layoutNodes(
  nodes: { id: string; type: string; data: { label: string } }[],
  edges: { id: string; source: string; target: string; label?: string }[]
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    const width = node.type === "decision" ? 100 : 150;
    const height = node.type === "decision" ? 100 : 50;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - (pos.width ?? 150) / 2, y: pos.y - (pos.height ?? 50) / 2 },
    };
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await request.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prompt = buildFlowGenerationPrompt({
    name: project.name,
    description: project.description,
    meta: {
      visionStatement: project.meta?.visionStatement ?? "",
      businessContext: project.meta?.businessContext ?? "",
      targetUsers: project.meta?.targetUsers ?? "",
    },
    objectives: project.objectives.map((o) => ({
      title: o.title,
      successCriteria: o.successCriteria,
    })),
    userStories: project.userStories.map((s) => ({
      role: s.role,
      capability: s.capability,
      benefit: s.benefit,
    })),
  });

  try {
    const raw = await generateStructuredJSON(prompt);
    const parsed = JSON.parse(raw);
    const nodes = parsed.nodes ?? [];
    const edges = (parsed.edges ?? []).map((e: { id?: string; source: string; target: string; label?: string }, i: number) => ({
      id: e.id ?? `edge-${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
    }));
    const laidOutNodes = layoutNodes(nodes, edges);
    return NextResponse.json({ nodes: laidOutNodes, edges });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate flow" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Update existing generate route to include processFlows**

In `src/app/api/generate/route.ts`, add `processFlows: { orderBy: { sortOrder: "asc" } }` to the project include query, and pass the flows to `generateOutput`:

```typescript
// In the project include:
processFlows: { orderBy: { sortOrder: "asc" } },

// When calling generateOutput, add to the projectData:
processFlows: project.processFlows.map((f) => ({
  name: f.name,
  flowType: f.flowType,
  diagramData: f.diagramData as { nodes: []; edges: [] },
})),
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate-flow/ src/app/api/generate/route.ts
git commit -m "feat: add AI flow generation API route with dagre auto-layout"
```

---

## Task 13: Integration Testing and Polish

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors in new files.

- [ ] **Step 3: Manual verification checklist**

Start the dev server and verify:

```bash
npm run dev
```

- Navigate to a project, confirm "Processes" tab appears
- Click "Processes" tab, confirm empty state renders
- Add a new flow (both as-is and to-be)
- Drag nodes from toolbar onto canvas
- Connect nodes with edges
- Double-click nodes to edit labels
- Delete nodes and edges
- Verify auto-save (refresh page, changes persist)
- Navigate to wizard, confirm Step 7 "Process Flows" appears
- Add flows in wizard, complete wizard, confirm Review is now step 8
- Test AI Generate button (requires ANTHROPIC_API_KEY)
- Navigate to Generate tab, generate an output, confirm flow data appears in generated content

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: polish process flow designer integration"
```
