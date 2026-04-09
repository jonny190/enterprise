import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic();

export type GeneratedStory = {
  role: string;
  capability: string;
  benefit: string;
  priority: "must" | "should" | "could" | "wont";
};

const SYSTEM_PROMPT = `You are a requirements analyst. You will receive project context and must generate exactly 10 user stories in the "As a [role], I want [capability], so that [benefit]" format.

Return ONLY valid JSON with no markdown fences or additional text. Use this exact structure:

{
  "stories": [
    { "role": "user role", "capability": "what they want to do", "benefit": "why they want it", "priority": "must" }
  ]
}

Rules:
- Generate exactly 10 stories
- Each story must have role, capability, benefit, and priority
- priority must be one of: "must", "should", "could", "wont"
- Distribute priorities realistically: roughly 3-4 "must", 3-4 "should", 2-3 "could", 0-1 "wont"
- Stories should be specific to the project, not generic
- Cover different aspects of the system (core functionality, admin features, integrations, edge cases)
- Role should be a specific user type from the project context, not just "user"
- Capability should describe a concrete action, not a vague desire
- Benefit should explain the business value or user outcome`;

export async function generateStories(context: {
  businessContext: string;
  targetUsers: string;
  technicalConstraints: string;
  visionStatement: string;
  objectives: { title: string; successCriteria: string }[];
}): Promise<GeneratedStory[]> {
  const parts: string[] = [];

  if (context.visionStatement) {
    parts.push(`Vision: ${context.visionStatement}`);
  }
  if (context.businessContext) {
    parts.push(`Business Context: ${context.businessContext}`);
  }
  if (context.targetUsers) {
    parts.push(`Target Users: ${context.targetUsers}`);
  }
  if (context.technicalConstraints) {
    parts.push(`Technical Constraints: ${context.technicalConstraints}`);
  }
  if (context.objectives.length > 0) {
    parts.push(
      `Objectives:\n${context.objectives
        .map((o) => `- ${o.title}${o.successCriteria ? ` (Success: ${o.successCriteria})` : ""}`)
        .join("\n")}`
    );
  }

  const userPrompt = parts.length > 0
    ? `Generate 10 user stories for this project:\n\n${parts.join("\n\n")}`
    : "Generate 10 user stories for a generic software project. Make them cover common functionality areas.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(
    (c): c is TextBlock => c.type === "text"
  );

  if (!textBlock?.text) {
    throw new Error("AI generation returned no content.");
  }

  const parsed = JSON.parse(textBlock.text) as { stories: GeneratedStory[] };
  return parsed.stories;
}
