# Word/PDF Requirements Document Import

**Date:** 2026-03-26
**Status:** Draft

## Summary

Add the ability to import a technical requirements document (.docx or .pdf) at the start of the project wizard. The document is parsed for text, sent to Claude for structured extraction, and the results pre-fill all wizard steps. The user walks through each step to review and adjust before saving.

## Goals

- Allow users to bootstrap a project's requirements from an existing document
- Reduce manual data entry when a requirements doc already exists
- Capture content that doesn't map to existing categories in an import notes field

## Non-Goals

- Image/diagram extraction from documents (future enhancement, but code should be structured to support it later)
- Replacing the wizard flow -- this is a pre-fill mechanism, not a skip mechanism
- Importing from formats other than .docx and .pdf

## User Flow

1. User creates a new project (name + optional description) and lands on the wizard
2. Wizard Step 1 (Metadata) shows a dropzone at the top: "Import from a requirements document"
3. User drags/drops or clicks to select a .docx or .pdf file (max 24MB)
4. Dropzone enters loading state: shows file name, spinner, "Analysing your document..." text. Wizard form fields below become disabled/dimmed
5. File is sent to `POST /api/import/requirements` with the projectId
6. API extracts text content, sends to Claude for structured extraction, returns JSON
7. On success: dropzone shows green checkmark with file name, wizard form fields populate with parsed data
8. On failure: dropzone shows error message with retry option, form fields re-enable for manual entry
9. User reviews pre-filled metadata fields, edits as needed, and submits Step 1
10. Remaining wizard steps (Vision, Objectives, User Stories, NFRs, Constraints) are also pre-filled from the import data
11. User walks through each step, reviewing and adjusting before saving
12. Process Flows step (Step 7) is not populated by import -- left empty for manual entry

## Architecture

### New Module: `src/modules/import/`

```
src/modules/import/
  components/
    document-dropzone.tsx    # Upload UI with loading/success/error states
  lib/
    parse-document.ts        # Text extraction from .docx/.pdf
    analyse-document.ts      # AI prompt + structured JSON extraction
```

### New API Route: `POST /api/import/requirements`

**Location:** `src/app/api/import/requirements/route.ts`

**Request:** `FormData` with:
- `file` -- the .docx or .pdf file
- `projectId` -- the project to import into

**Auth:** Session check + org membership verification (same pattern as other API routes)

**Processing:**
1. Validate file (type, size)
2. Extract text via `parse-document.ts`
3. Send to Claude via `analyse-document.ts`
4. Return structured JSON

**Response:** JSON matching the wizard data shape (see below)

### Document Parsing: `parse-document.ts`

Uses `mammoth` for .docx and `pdf-parse` for .pdf files. Returns a structured result:

```typescript
type ParsedDocument = {
  text: string;
  images: ParsedImage[];  // Empty array for now, future: extracted images
};

type ParsedImage = {
  data: Buffer;
  mimeType: string;
  description?: string;
};
```

Text-only extraction for the initial implementation. The `images` array is included in the type so that image extraction can be added later without changing the interface. The `analyse-document.ts` function accepts this structure and is ready to forward images to Claude's vision API when supported.

### AI Analysis: `analyse-document.ts`

Non-streaming call to Claude (similar to existing `generateStructuredJSON` pattern). The prompt instructs Claude to extract structured requirements from the document text and return JSON.

**Output JSON shape:**

```json
{
  "meta": {
    "businessContext": "",
    "targetUsers": "",
    "stakeholders": "",
    "timeline": "",
    "technicalConstraints": "",
    "glossary": ""
  },
  "vision": "",
  "objectives": [
    { "title": "", "successCriteria": "" }
  ],
  "userStories": [
    { "role": "", "capability": "", "benefit": "", "priority": "must|should|could|wont" }
  ],
  "nfrCategories": [
    {
      "name": "Performance|Security|Scalability|Availability|Usability|Maintainability",
      "requirements": [
        {
          "title": "",
          "description": "",
          "priority": "must|should|could|wont",
          "metrics": [
            { "metricName": "", "targetValue": "", "unit": "" }
          ]
        }
      ]
    }
  ],
  "constraints": [
    {
      "type": "constraint|assumption|dependency",
      "name": "",
      "items": [
        { "title": "", "description": "" }
      ]
    }
  ],
  "importNotes": ""
}
```

Fields that cannot be extracted from the document are left as empty strings or empty arrays. The `importNotes` field captures any content that could not be mapped to the existing categories.

### UI: `document-dropzone.tsx`

Placed at the top of `StepMetadata` component. States:

- **Idle:** Dashed border area with upload icon. "Import from a requirements document" heading. "Drag and drop a .docx or .pdf file, or click to browse" subtext.
- **Loading:** File name displayed, spinner, "Analysing your document..." text. Wizard form fields below are disabled/dimmed.
- **Success:** Green checkmark, file name, "Document imported successfully" text.
- **Error:** Error message with description and "Try again" link. Form fields re-enable.

The dropzone is collapsible -- users who don't want to import can scroll past it.

### State Propagation

- The parsed JSON response is stored as state in `WizardClient` (e.g. `importedData`)
- `WizardClient` already passes `initialData` to each step component
- When `importedData` is set, it merges with/overrides `initialData` for each step
- Step components don't need structural changes -- they already use `defaultValue` on form fields
- No data is written to the database during import. The user saves each step normally.

### Database Change

Add one field to `ProjectMeta`:

```prisma
importNotes  String  @default("")
```

Migration name: `add-import-notes-to-project-meta`

This field stores content from the imported document that Claude could not categorize into existing requirement types. Displayed as a read-only "Additional notes from import" section at the bottom of the metadata step, only visible when populated.

### New Dependencies

- `mammoth` -- Word document text extraction
- `pdf-parse` -- PDF text extraction

## Error Handling

- **File too large (>24MB):** Rejected client-side and server-side with message "File too large. Maximum size is 24MB."
- **Unsupported file type:** Rejected at dropzone level (accept attribute) and server-side validation
- **Corrupt/unreadable file:** Parsing failure returns "Could not read this document. Please check the file and try again."
- **AI extraction failure:** API error returned, user can retry or proceed manually
- **Partial extraction:** Valid -- empty fields stay empty for the user to fill in manually
- **Very long documents:** If extracted text exceeds ~150k characters, truncate and note in `importNotes` that the document was partially analysed
- **Scanned/image-only PDFs:** pdf-parse returns little/no text. If extracted text is very short, return a message suggesting the user check the file contains selectable text

## Future Considerations

- **Image extraction:** The `ParsedDocument` type includes an `images` array (empty for now). When image support is added, the parsing functions populate this array and `analyse-document.ts` sends images to Claude's vision API alongside the text.
- **Additional file formats:** The parsing module can be extended with new extractors without changing the API route or AI analysis logic.
- **Re-import:** Currently import is only available at wizard start. A future enhancement could allow re-importing on the requirements tab.

## Files to Create/Modify

**New files:**
- `src/modules/import/components/document-dropzone.tsx`
- `src/modules/import/lib/parse-document.ts`
- `src/modules/import/lib/analyse-document.ts`
- `src/app/api/import/requirements/route.ts`
- Prisma migration for `importNotes` field

**Modified files:**
- `prisma/schema.prisma` -- add `importNotes` to `ProjectMeta`
- `src/modules/wizard/components/step-metadata.tsx` -- add dropzone component
- `src/modules/wizard/components/wizard-client.tsx` -- add `importedData` state and merge logic
- `src/modules/wizard/actions.ts` -- save `importNotes` in `saveProjectMeta`
