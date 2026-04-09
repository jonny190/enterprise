# Word/PDF Requirements Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload a .docx or .pdf requirements document at the start of the project wizard, have it analysed by Claude, and pre-fill all wizard steps with the extracted data.

**Architecture:** A new `src/modules/import/` module handles document parsing and AI extraction. A new API route accepts file uploads, extracts text via mammoth/pdf-parse, sends to Claude for structured JSON extraction, and returns the result. The wizard client stores the import data and uses a key-based remount to pre-fill each step's uncontrolled form inputs.

**Tech Stack:** mammoth (Word parsing), pdf-parse (PDF parsing), Anthropic SDK (Claude structured extraction), Next.js API routes, React state management, Prisma migration.

---

## File Structure

**New files:**
- `src/modules/import/lib/parse-document.ts` -- text extraction from .docx/.pdf, returns `ParsedDocument` with text + images array (images empty for now)
- `src/modules/import/lib/analyse-document.ts` -- sends extracted text to Claude, returns structured JSON matching wizard data shape
- `src/modules/import/components/document-dropzone.tsx` -- upload UI with idle/loading/success/error states
- `src/app/api/import/requirements/route.ts` -- POST endpoint accepting FormData, orchestrates parsing + analysis

**Modified files:**
- `prisma/schema.prisma` -- add `importNotes` field to `ProjectMeta`
- `src/modules/wizard/actions.ts` -- add `importNotes` to `saveProjectMeta` data shape
- `src/modules/wizard/components/wizard-client.tsx` -- add `importedData` state, key-based remount, pass import callback to StepMetadata
- `src/modules/wizard/components/step-metadata.tsx` -- render DocumentDropzone, pass import notes

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install mammoth and pdf-parse**

```bash
npm install mammoth pdf-parse
```

- [ ] **Step 2: Install type definitions**

```bash
npm install -D @types/pdf-parse
```

Note: mammoth ships its own types. pdf-parse needs `@types/pdf-parse`.

- [ ] **Step 3: Verify installation**

```bash
node -e "require('mammoth'); require('pdf-parse'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mammoth and pdf-parse for document import"
```

---

### Task 2: Add importNotes field to ProjectMeta

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/modules/wizard/actions.ts`

- [ ] **Step 1: Add the field to the Prisma schema**

In `prisma/schema.prisma`, add `importNotes` to the `ProjectMeta` model after the `glossary` field:

```prisma
model ProjectMeta {
  id                   String  @id @default(uuid())
  projectId            String  @unique
  businessContext       String  @default("")
  visionStatement      String  @default("")
  targetUsers          String  @default("")
  technicalConstraints String  @default("")
  timeline             String  @default("")
  stakeholders         String  @default("")
  glossary             String  @default("")
  importNotes          String  @default("")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Generate migration**

```bash
npx prisma migrate dev --name add-import-notes-to-project-meta
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Update saveProjectMeta action**

In `src/modules/wizard/actions.ts`, update the `saveProjectMeta` function's data type and spread to include `importNotes`:

```typescript
export async function saveProjectMeta(
  projectId: string,
  data: {
    businessContext: string;
    targetUsers: string;
    stakeholders: string;
    timeline: string;
    glossary: string;
    technicalConstraints: string;
    importNotes?: string;
  }
) {
  await getProjectWithAuth(projectId);

  await prisma.projectMeta.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
```

The `importNotes` field is optional so existing callers (the wizard form) don't need to pass it.

- [ ] **Step 4: Verify Prisma generate**

```bash
npx prisma generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/modules/wizard/actions.ts
git commit -m "feat: add importNotes field to ProjectMeta"
```

---

### Task 3: Create document parser

**Files:**
- Create: `src/modules/import/lib/parse-document.ts`

- [ ] **Step 1: Create the parse-document module**

Create `src/modules/import/lib/parse-document.ts`:

```typescript
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export type ParsedImage = {
  data: Buffer;
  mimeType: string;
  description?: string;
};

export type ParsedDocument = {
  text: string;
  images: ParsedImage[];
};

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB

const SUPPORTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
];

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 24MB.";
  }
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return "Unsupported file type. Please upload a .docx or .pdf file.";
  }
  return null;
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    return parsePdf(buffer);
  }

  return parseDocx(buffer);
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    images: [], // Future: extract embedded images
  };
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const result = await pdfParse(buffer);
  return {
    text: result.text,
    images: [], // Future: render pages as images for vision API
  };
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/modules/import/lib/parse-document.ts 2>&1 || echo "Check errors above"
```

If there are type issues with pdf-parse, check if `@types/pdf-parse` installed correctly. If not available, create a minimal declaration:

Create `src/modules/import/lib/pdf-parse.d.ts` only if needed:

```typescript
declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }
  export default function pdfParse(buffer: Buffer): Promise<PDFData>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/import/
git commit -m "feat: add document parser for .docx and .pdf"
```

---

### Task 4: Create AI document analyser

**Files:**
- Create: `src/modules/import/lib/analyse-document.ts`

- [ ] **Step 1: Define the import data types**

Create `src/modules/import/lib/analyse-document.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import type { ParsedDocument } from "./parse-document";

export type ImportedMeta = {
  businessContext: string;
  targetUsers: string;
  stakeholders: string;
  timeline: string;
  technicalConstraints: string;
  glossary: string;
};

export type ImportedObjective = {
  title: string;
  successCriteria: string;
};

export type ImportedUserStory = {
  role: string;
  capability: string;
  benefit: string;
  priority: "must" | "should" | "could" | "wont";
};

export type ImportedNFRCategory = {
  name: string;
  requirements: {
    title: string;
    description: string;
    priority: "must" | "should" | "could" | "wont";
    metrics: { metricName: string; targetValue: string; unit: string }[];
  }[];
};

export type ImportedConstraintCategory = {
  type: "constraint" | "assumption" | "dependency";
  name: string;
  requirements: {
    title: string;
    description: string;
    priority: "must" | "should" | "could" | "wont";
  }[];
};

export type ImportedData = {
  meta: ImportedMeta;
  visionStatement: string;
  objectives: ImportedObjective[];
  userStories: ImportedUserStory[];
  nfrCategories: ImportedNFRCategory[];
  constraints: ImportedConstraintCategory[];
  importNotes: string;
};
```

- [ ] **Step 2: Add the analysis function**

Append to the same file:

```typescript
const client = new Anthropic();

const MAX_TEXT_LENGTH = 150000;

const SYSTEM_PROMPT = `You are a requirements analyst. You will receive the text content of a technical requirements document. Extract the information into a structured JSON format.

Return ONLY valid JSON with no markdown fences or additional text. Use this exact structure:

{
  "meta": {
    "businessContext": "Why this project exists, what problem it solves",
    "targetUsers": "Who will use the product",
    "stakeholders": "Key people and roles involved",
    "timeline": "Milestones, deadlines, or timeline information",
    "technicalConstraints": "Technology requirements, existing systems, integrations",
    "glossary": "Domain-specific terms and definitions found in the document"
  },
  "visionStatement": "A single clear statement of what the project will achieve",
  "objectives": [
    { "title": "Objective name", "successCriteria": "How to measure success" }
  ],
  "userStories": [
    { "role": "user role", "capability": "what they want to do", "benefit": "why they want it", "priority": "must" }
  ],
  "nfrCategories": [
    {
      "name": "Category name (Performance, Security, Scalability, Availability, Usability, or Maintainability)",
      "requirements": [
        {
          "title": "Requirement name",
          "description": "Detailed description",
          "priority": "must",
          "metrics": [
            { "metricName": "What to measure", "targetValue": "Target number", "unit": "Unit of measurement" }
          ]
        }
      ]
    }
  ],
  "constraints": [
    {
      "type": "constraint",
      "name": "Category name",
      "requirements": [
        { "title": "Item name", "description": "Details", "priority": "should" }
      ]
    }
  ],
  "importNotes": "Any content from the document that could not be categorised into the above structure"
}

Rules:
- priority values must be one of: "must", "should", "could", "wont"
- constraint type values must be one of: "constraint", "assumption", "dependency"
- NFR category names should be one of: Performance, Security, Scalability, Availability, Usability, Maintainability
- If information for a field is not found in the document, use an empty string or empty array
- The importNotes field should capture anything that does not fit the other categories
- Extract as much structured data as possible from the document`;

export async function analyseDocument(
  document: ParsedDocument
): Promise<ImportedData> {
  let text = document.text;

  if (text.length > MAX_TEXT_LENGTH) {
    text =
      text.slice(0, MAX_TEXT_LENGTH) +
      "\n\n[Document truncated due to length. Some content may not have been analysed.]";
  }

  if (text.trim().length < 50) {
    throw new Error(
      "Very little text could be extracted from this document. If this is a scanned PDF, please ensure it contains selectable text."
    );
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the requirements document to analyse:\n\n${text}`,
      },
    ],
  });

  const textBlock = response.content.find(
    (c): c is TextBlock => c.type === "text"
  );

  if (!textBlock?.text) {
    throw new Error("AI analysis returned no content.");
  }

  const parsed = JSON.parse(textBlock.text) as ImportedData;
  return parsed;
}
```

- [ ] **Step 3: Verify the file compiles**

```bash
npx tsc --noEmit src/modules/import/lib/analyse-document.ts 2>&1 || echo "Check errors above"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/import/lib/analyse-document.ts
git commit -m "feat: add AI document analyser for requirements extraction"
```

---

### Task 5: Create the API route

**Files:**
- Create: `src/app/api/import/requirements/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/import/requirements/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateFile, parseDocument } from "@/modules/import/lib/parse-document";
import { analyseDocument } from "@/modules/import/lib/analyse-document";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json(
      { error: "Missing file or projectId" },
      { status: 400 }
    );
  }

  // Validate file
  const validationError = validateFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const parsed = await parseDocument(file);
    const importedData = await analyseDocument(parsed);
    return NextResponse.json(importedData);
  } catch (error) {
    console.error("Import failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not read this document. Please check the file and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/app/api/import/requirements/route.ts 2>&1 || echo "Check errors above"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/import/requirements/
git commit -m "feat: add API route for document import"
```

---

### Task 6: Create the dropzone component

**Files:**
- Create: `src/modules/import/components/document-dropzone.tsx`

- [ ] **Step 1: Create the dropzone component**

Create `src/modules/import/components/document-dropzone.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { ImportedData } from "@/modules/import/lib/analyse-document";

type DropzoneState = "idle" | "loading" | "success" | "error";

export function DocumentDropzone({
  projectId,
  onImportStart,
  onImportComplete,
}: {
  projectId: string;
  onImportStart?: () => void;
  onImportComplete: (data: ImportedData) => void;
  onImportError?: () => void;
}) {
  const [state, setState] = useState<DropzoneState>("idle");
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Client-side validation
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setState("error");
        setErrorMessage(
          "Unsupported file type. Please upload a .docx or .pdf file."
        );
        return;
      }
      if (file.size > 24 * 1024 * 1024) {
        setState("error");
        setErrorMessage("File too large. Maximum size is 24MB.");
        return;
      }

      setFileName(file.name);
      setState("loading");
      setErrorMessage("");
      onImportStart?.();

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);

        const response = await fetch("/api/import/requirements", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || "Import failed. Please try again."
          );
        }

        const importedData: ImportedData = await response.json();
        setState("success");
        onImportComplete(importedData);
      } catch (error) {
        setState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Import failed. Please try again."
        );
        onImportError?.();
      }
    },
    [projectId, onImportComplete]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleClick() {
    if (state === "loading") return;
    fileInputRef.current?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function handleRetry() {
    setState("idle");
    setFileName("");
    setErrorMessage("");
  }

  return (
    <div className="mb-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          state === "idle"
            ? "border-gray-700 hover:border-gray-500"
            : state === "loading"
              ? "cursor-wait border-blue-600 bg-blue-600/5"
              : state === "success"
                ? "border-green-600 bg-green-600/5"
                : "border-red-600 bg-red-600/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {state === "idle" && (
          <>
            <Upload className="mx-auto mb-2 h-8 w-8 text-gray-500" />
            <p className="text-sm font-medium text-gray-300">
              Import from a requirements document
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Drag and drop a .docx or .pdf file, or click to browse
            </p>
          </>
        )}

        {state === "loading" && (
          <>
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm font-medium text-gray-300">{fileName}</p>
            <p className="mt-1 text-xs text-blue-400">
              Analysing your document...
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm font-medium text-gray-300">{fileName}</p>
            <p className="mt-1 text-xs text-green-400">
              Document imported successfully
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm font-medium text-gray-300">{errorMessage}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="mt-2 text-xs text-red-400 underline hover:text-red-300"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/modules/import/components/document-dropzone.tsx 2>&1 || echo "Check errors above"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/import/components/document-dropzone.tsx
git commit -m "feat: add document dropzone component"
```

---

### Task 7: Wire up the wizard to handle imported data

**Files:**
- Modify: `src/modules/wizard/components/wizard-client.tsx`
- Modify: `src/modules/wizard/components/step-metadata.tsx`

- [ ] **Step 1: Update WizardClient to hold import state**

Replace the entire content of `src/modules/wizard/components/wizard-client.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { WizardShell } from "./wizard-shell";
import { StepMetadata } from "./step-metadata";
import { StepVision } from "./step-vision";
import { StepObjectives } from "./step-objectives";
import { StepUserStories } from "./step-user-stories";
import { StepNFR } from "./step-nfr";
import { StepConstraints } from "./step-constraints";
import { StepReview } from "./step-review";
import { StepProcessFlows } from "./step-process-flows";
import { Priority, FlowType } from "@prisma/client";
import type { ImportedData } from "@/modules/import/lib/analyse-document";

type Props = {
  projectId: string;
  initialStep: number;
  initialCompletedSteps: number[];
  meta: {
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  };
  objectives: { title: string; successCriteria: string }[];
  userStories: {
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[];
  nfrCategories: {
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: Priority;
      metrics: { metricName: string; targetValue: string; unit: string }[];
    }[];
  }[];
  constraintItems: {
    type: "constraint" | "assumption" | "dependency";
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: Priority;
    }[];
  }[];
  processFlows: {
    name: string;
    flowType: FlowType;
    diagramData: unknown;
    sortOrder: number;
  }[];
};

export function WizardClient(props: Props) {
  const [importedData, setImportedData] = useState<ImportedData | null>(null);

  const handleImportComplete = useCallback((data: ImportedData) => {
    setImportedData(data);
  }, []);

  // Merge imported data with initial data from the database
  const meta = importedData
    ? {
        businessContext: importedData.meta.businessContext || props.meta.businessContext,
        visionStatement: importedData.visionStatement || props.meta.visionStatement,
        targetUsers: importedData.meta.targetUsers || props.meta.targetUsers,
        technicalConstraints: importedData.meta.technicalConstraints || props.meta.technicalConstraints,
        timeline: importedData.meta.timeline || props.meta.timeline,
        stakeholders: importedData.meta.stakeholders || props.meta.stakeholders,
        glossary: importedData.meta.glossary || props.meta.glossary,
      }
    : props.meta;

  const objectives = importedData?.objectives.length
    ? importedData.objectives
    : props.objectives;

  const userStories = importedData?.userStories.length
    ? importedData.userStories.map((s) => ({
        ...s,
        priority: s.priority as Priority,
      }))
    : props.userStories;

  const nfrCategories = importedData?.nfrCategories.length
    ? importedData.nfrCategories.map((c) => ({
        name: c.name,
        requirements: c.requirements.map((r) => ({
          ...r,
          priority: r.priority as Priority,
          metrics: r.metrics,
        })),
      }))
    : props.nfrCategories;

  const constraintItems = importedData?.constraints.length
    ? importedData.constraints.map((c) => ({
        type: c.type,
        name: c.name,
        requirements: c.requirements.map((r) => ({
          ...r,
          priority: r.priority as Priority,
        })),
      }))
    : props.constraintItems;

  const importNotes = importedData?.importNotes || "";

  // Key changes when import data arrives, forcing step components to remount
  // with new defaultValues
  const stepKey = importedData ? "imported" : "manual";

  return (
    <WizardShell
      projectId={props.projectId}
      initialStep={props.initialStep}
      initialCompletedSteps={props.initialCompletedSteps}
      renderStep={(step, onComplete) => {
        switch (step) {
          case 1:
            return (
              <StepMetadata
                key={stepKey}
                projectId={props.projectId}
                initialData={meta}
                importNotes={importNotes}
                onImportComplete={handleImportComplete}
                onComplete={onComplete}
              />
            );
          case 2:
            return (
              <StepVision
                key={stepKey}
                projectId={props.projectId}
                initialValue={meta.visionStatement}
                onComplete={onComplete}
              />
            );
          case 3:
            return (
              <StepObjectives
                key={stepKey}
                projectId={props.projectId}
                initialObjectives={objectives}
                onComplete={onComplete}
              />
            );
          case 4:
            return (
              <StepUserStories
                key={stepKey}
                projectId={props.projectId}
                initialStories={userStories}
                onComplete={onComplete}
              />
            );
          case 5:
            return (
              <StepNFR
                key={stepKey}
                projectId={props.projectId}
                initialCategories={nfrCategories}
                onComplete={onComplete}
              />
            );
          case 6:
            return (
              <StepConstraints
                key={stepKey}
                projectId={props.projectId}
                initialItems={constraintItems}
                onComplete={onComplete}
              />
            );
          case 7:
            return (
              <StepProcessFlows
                projectId={props.projectId}
                initialFlows={
                  props.processFlows?.map((f) => ({
                    name: f.name,
                    flowType: f.flowType,
                    diagramData: (f.diagramData as { nodes: unknown[]; edges: unknown[] }) ?? { nodes: [], edges: [] },
                  })) ?? []
                }
                onComplete={onComplete}
              />
            );
          case 8:
            return (
              <StepReview
                projectId={props.projectId}
                data={{
                  meta,
                  objectives,
                  userStories,
                  nfrCount: nfrCategories.length,
                  constraintCount: constraintItems.length,
                }}
              />
            );
          default:
            return null;
        }
      }}
    />
  );
}
```

- [ ] **Step 2: Update StepMetadata to include the dropzone and import notes**

Replace the entire content of `src/modules/wizard/components/step-metadata.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProjectMeta } from "@/modules/wizard/actions";
import { DocumentDropzone } from "@/modules/import/components/document-dropzone";
import type { ImportedData } from "@/modules/import/lib/analyse-document";

type MetaData = {
  businessContext: string;
  targetUsers: string;
  stakeholders: string;
  timeline: string;
  glossary: string;
  technicalConstraints: string;
};

export function StepMetadata({
  projectId,
  initialData,
  importNotes,
  onImportComplete,
  onComplete,
}: {
  projectId: string;
  initialData: MetaData;
  importNotes?: string;
  onImportComplete?: (data: ImportedData) => void;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  function handleImportStart() {
    setIsImporting(true);
  }

  function handleImport(data: ImportedData) {
    setIsImporting(false);
    onImportComplete?.(data);
  }

  function handleImportError() {
    setIsImporting(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    await saveProjectMeta(projectId, {
      businessContext: fd.get("businessContext") as string,
      targetUsers: fd.get("targetUsers") as string,
      stakeholders: fd.get("stakeholders") as string,
      timeline: fd.get("timeline") as string,
      glossary: fd.get("glossary") as string,
      technicalConstraints: fd.get("technicalConstraints") as string,
      importNotes: importNotes || undefined,
    });

    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Project Metadata</h3>
        <p className="text-sm text-gray-400">
          Provide context about the project, its users, and constraints.
        </p>
      </div>

      {onImportComplete && (
        <DocumentDropzone
          projectId={projectId}
          onImportStart={handleImportStart}
          onImportComplete={handleImport}
          onImportError={handleImportError}
        />
      )}

      <fieldset disabled={isImporting}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium">
              Business Context
            </label>
            <Textarea
              name="businessContext"
              rows={3}
              defaultValue={initialData.businessContext}
              placeholder="Why does this project exist? What problem does it solve?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Target Users</label>
            <Textarea
              name="targetUsers"
              rows={2}
              defaultValue={initialData.targetUsers}
              placeholder="Who will use the final product?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Stakeholders</label>
            <Textarea
              name="stakeholders"
              rows={2}
              defaultValue={initialData.stakeholders}
              placeholder="Key people and roles involved"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Timeline</label>
            <Input
              name="timeline"
              defaultValue={initialData.timeline}
              placeholder="Expected milestones or deadlines"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Technical Constraints
            </label>
            <Textarea
              name="technicalConstraints"
              rows={2}
              defaultValue={initialData.technicalConstraints}
              placeholder="Existing systems, tech stack requirements, integrations"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Glossary</label>
            <Textarea
              name="glossary"
              rows={2}
              defaultValue={initialData.glossary}
              placeholder="Domain-specific terms and definitions"
            />
          </div>

          {importNotes && (
            <div>
              <label className="block text-sm font-medium text-amber-400">
                Additional Notes from Import
              </label>
              <p className="mb-1 text-xs text-gray-500">
                Content from the document that could not be automatically
                categorised. Review and incorporate into the appropriate fields
                above.
              </p>
              <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-gray-300 whitespace-pre-wrap">
                {importNotes}
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading || isImporting}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/wizard/components/wizard-client.tsx src/modules/wizard/components/step-metadata.tsx
git commit -m "feat: wire up document import into wizard flow"
```

---

### Task 8: Build verification and manual testing

**Files:** None (verification only)

- [ ] **Step 1: Run the full build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Run the linter**

```bash
npm run lint
```

Expected: No errors. Fix any warnings.

- [ ] **Step 3: Start the dev server and test manually**

```bash
npm run dev
```

Manual test plan:
1. Create a new project in any organisation
2. Land on the wizard -- verify the dropzone appears at the top of Step 1
3. Upload a .docx file -- verify loading state shows "Analysing your document..."
4. After processing, verify the metadata fields are pre-filled
5. Click Continue and verify Step 2 (Vision) is pre-filled
6. Walk through remaining steps and verify data appears
7. Test error cases: upload a .txt file (should be rejected), upload with no content
8. Test proceeding without uploading -- wizard should work exactly as before

- [ ] **Step 4: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "fix: lint and build fixes for document import"
```
