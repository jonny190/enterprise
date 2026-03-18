import Anthropic from "@anthropic-ai/sdk";
import { type TextBlock } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic();

export type StructuralCheck = {
  section: string;
  status: "complete" | "partial" | "missing";
  detail: string;
};

export type AIInsight = {
  category: "gap" | "vague" | "conflict" | "suggestion";
  severity: "high" | "medium" | "low";
  section: string;
  message: string;
};

export type ScoringResult = {
  overallScore: number;
  structuralChecks: StructuralCheck[];
  aiInsights: AIInsight[];
};

export function runStructuralChecks(project: {
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
  } | null;
  objectives: { title: string; successCriteria: string }[];
  userStories: { role: string; capability: string; benefit: string; priority: string }[];
  requirementCategories: {
    type: string;
    name: string;
    requirements: { title: string; description: string; priority: string }[];
  }[];
  processFlows: { name: string }[];
}): StructuralCheck[] {
  const checks: StructuralCheck[] = [];

  // Vision
  if (project.meta?.visionStatement) {
    checks.push({ section: "Vision Statement", status: "complete", detail: "Vision statement is defined" });
  } else {
    checks.push({ section: "Vision Statement", status: "missing", detail: "No vision statement set" });
  }

  // Business context
  if (project.meta?.businessContext) {
    checks.push({ section: "Business Context", status: "complete", detail: "Business context is defined" });
  } else {
    checks.push({ section: "Business Context", status: "missing", detail: "No business context set" });
  }

  // Target users
  if (project.meta?.targetUsers) {
    checks.push({ section: "Target Users", status: "complete", detail: "Target users are defined" });
  } else {
    checks.push({ section: "Target Users", status: "missing", detail: "No target users defined" });
  }

  // Timeline
  if (project.meta?.timeline) {
    checks.push({ section: "Timeline", status: "complete", detail: "Timeline is defined" });
  } else {
    checks.push({ section: "Timeline", status: "missing", detail: "No timeline set" });
  }

  // Objectives
  if (project.objectives.length === 0) {
    checks.push({ section: "Objectives", status: "missing", detail: "No objectives defined" });
  } else {
    const withCriteria = project.objectives.filter((o) => o.successCriteria.trim());
    if (withCriteria.length === project.objectives.length) {
      checks.push({ section: "Objectives", status: "complete", detail: `${project.objectives.length} objectives, all with success criteria` });
    } else {
      checks.push({ section: "Objectives", status: "partial", detail: `${project.objectives.length} objectives, ${project.objectives.length - withCriteria.length} missing success criteria` });
    }
  }

  // User stories
  if (project.userStories.length === 0) {
    checks.push({ section: "User Stories", status: "missing", detail: "No user stories defined" });
  } else {
    const withBenefit = project.userStories.filter((s) => s.benefit.trim());
    if (withBenefit.length === project.userStories.length) {
      checks.push({ section: "User Stories", status: "complete", detail: `${project.userStories.length} stories, all with benefits` });
    } else {
      checks.push({ section: "User Stories", status: "partial", detail: `${project.userStories.length} stories, ${project.userStories.length - withBenefit.length} missing benefit` });
    }
  }

  // NFRs
  const nfrs = project.requirementCategories.filter((c) => c.type === "non_functional");
  if (nfrs.length === 0) {
    checks.push({ section: "Non-Functional Requirements", status: "missing", detail: "No NFR categories defined" });
  } else {
    const totalReqs = nfrs.reduce((s, c) => s + c.requirements.length, 0);
    checks.push({ section: "Non-Functional Requirements", status: totalReqs > 0 ? "complete" : "partial", detail: `${nfrs.length} categories, ${totalReqs} requirements` });
  }

  // Constraints
  const constraints = project.requirementCategories.filter((c) => c.type !== "non_functional");
  if (constraints.length === 0) {
    checks.push({ section: "Constraints & Dependencies", status: "missing", detail: "No constraints defined" });
  } else {
    checks.push({ section: "Constraints & Dependencies", status: "complete", detail: `${constraints.length} categories defined` });
  }

  // Process flows
  if (project.processFlows.length === 0) {
    checks.push({ section: "Process Flows", status: "missing", detail: "No process flows defined" });
  } else {
    checks.push({ section: "Process Flows", status: "complete", detail: `${project.processFlows.length} flows defined` });
  }

  return checks;
}

export function calculateStructuralScore(checks: StructuralCheck[]): number {
  const weights: Record<string, number> = { complete: 1, partial: 0.5, missing: 0 };
  const total = checks.reduce((s, c) => s + weights[c.status], 0);
  return Math.round((total / checks.length) * 100);
}

export async function runAIAnalysis(projectSummary: string): Promise<AIInsight[]> {
  const systemPrompt = `You are a requirements analyst reviewing a project for completeness and quality.
Analyze the project requirements and return a JSON array of insights. Each insight must have:
- "category": one of "gap" (missing requirement), "vague" (unclear/unmeasurable criteria), "conflict" (contradicting requirements), "suggestion" (improvement idea)
- "severity": one of "high", "medium", "low"
- "section": which section this applies to (e.g. "User Stories", "Objectives", "NFRs")
- "message": a specific, actionable description of the issue

Focus on the most impactful issues. Return 3-8 insights maximum. Return only the JSON array, no other text.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: projectSummary }],
    });

    const textBlock = response.content.find((c): c is TextBlock => c.type === "text");
    const text = textBlock?.text ?? "[]";

    // Extract JSON from possible markdown fences
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item: Record<string, unknown>) =>
        item.category && item.severity && item.section && item.message
    ) as AIInsight[];
  } catch {
    return [];
  }
}

export function buildProjectSummaryForAnalysis(project: {
  name: string;
  description: string;
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
  } | null;
  objectives: { title: string; successCriteria: string }[];
  userStories: { role: string; capability: string; benefit: string; priority: string }[];
  requirementCategories: {
    type: string;
    name: string;
    requirements: { title: string; description: string; priority: string }[];
  }[];
}): string {
  let summary = `# Project: ${project.name}\n${project.description}\n\n`;

  if (project.meta) {
    if (project.meta.visionStatement) summary += `## Vision\n${project.meta.visionStatement}\n\n`;
    if (project.meta.businessContext) summary += `## Business Context\n${project.meta.businessContext}\n\n`;
    if (project.meta.targetUsers) summary += `## Target Users\n${project.meta.targetUsers}\n\n`;
    if (project.meta.technicalConstraints) summary += `## Technical Constraints\n${project.meta.technicalConstraints}\n\n`;
    if (project.meta.timeline) summary += `## Timeline\n${project.meta.timeline}\n\n`;
  }

  if (project.objectives.length > 0) {
    summary += `## Objectives\n`;
    project.objectives.forEach((o, i) => {
      summary += `${i + 1}. ${o.title}`;
      if (o.successCriteria) summary += ` (Success: ${o.successCriteria})`;
      summary += "\n";
    });
    summary += "\n";
  }

  if (project.userStories.length > 0) {
    summary += `## User Stories\n`;
    project.userStories.forEach((s, i) => {
      summary += `${i + 1}. [${s.priority}] As a ${s.role}, I want ${s.capability}`;
      if (s.benefit) summary += `, so that ${s.benefit}`;
      summary += "\n";
    });
    summary += "\n";
  }

  for (const cat of project.requirementCategories) {
    summary += `## ${cat.name} (${cat.type})\n`;
    cat.requirements.forEach((r) => {
      summary += `- [${r.priority}] ${r.title}: ${r.description}\n`;
    });
    summary += "\n";
  }

  return summary;
}
