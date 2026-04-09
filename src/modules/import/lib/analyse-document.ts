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
  // Build the message content based on document type
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] =
    document.pdfBuffer
      ? [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: document.pdfBuffer.toString("base64"),
            },
          },
          {
            type: "text" as const,
            text: "Analyse this requirements document and extract the structured data.",
          },
        ]
      : (() => {
          let text = document.text;
          if (text.length > MAX_TEXT_LENGTH) {
            text =
              text.slice(0, MAX_TEXT_LENGTH) +
              "\n\n[Document truncated due to length. Some content may not have been analysed.]";
          }
          if (text.trim().length < 50) {
            throw new Error(
              "Very little text could be extracted from this document. Please check the file contains readable text."
            );
          }
          return `Here is the requirements document to analyse:\n\n${text}`;
        })();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find(
    (c): c is TextBlock => c.type === "text"
  );

  if (!textBlock?.text) {
    throw new Error("AI analysis returned no content.");
  }

  // Strip markdown fences if Claude wrapped the JSON
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed = JSON.parse(jsonText) as ImportedData;
  return parsed;
}
