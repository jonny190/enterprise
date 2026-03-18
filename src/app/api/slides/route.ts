import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { type TextBlock } from "@anthropic-ai/sdk/resources/messages";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await req.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: { orderBy: { sortOrder: "asc" } },
        },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const projectSummary = buildSummary(project);

  const systemPrompt = `You are creating a presentation slide deck from project requirements. Return a JSON array of slide objects. Each slide has:
- "title": string (short, punchy slide title)
- "bullets": string[] (3-6 bullet points, concise)
- "notes": string (optional speaker notes, 1-2 sentences)

Create 8-12 slides covering:
1. Title slide (project name + one-line description)
2. Vision and context
3. Target users
4. Key objectives (split across slides if many)
5. User stories highlights (grouped by priority)
6. Non-functional requirements summary
7. Constraints and dependencies
8. Process flows overview (if any)
9. Timeline
10. Next steps / open questions

Keep bullets concise - max 10 words each. Write for a stakeholder audience.
Return ONLY the JSON array, no other text or markdown fences.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: projectSummary }],
    });

    const textBlock = response.content.find((c): c is TextBlock => c.type === "text");
    const text = textBlock?.text ?? "[]";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ error: "Failed to parse slides" }, { status: 500 });
    }

    const slides = JSON.parse(jsonMatch[0]);
    return Response.json({ slides, projectName: project.name });
  } catch {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSummary(project: any): string {
  let s = `# ${project.name}\n${project.description}\n\n`;

  const meta = project.meta;
  if (meta) {
    if (meta.visionStatement) s += `## Vision\n${meta.visionStatement}\n\n`;
    if (meta.businessContext) s += `## Business Context\n${meta.businessContext}\n\n`;
    if (meta.targetUsers) s += `## Target Users\n${meta.targetUsers}\n\n`;
    if (meta.technicalConstraints) s += `## Technical Constraints\n${meta.technicalConstraints}\n\n`;
    if (meta.timeline) s += `## Timeline\n${meta.timeline}\n\n`;
    if (meta.stakeholders) s += `## Stakeholders\n${meta.stakeholders}\n\n`;
  }

  if (project.objectives.length > 0) {
    s += `## Objectives\n`;
    project.objectives.forEach((o: { title: string; successCriteria: string }) => {
      s += `- ${o.title}`;
      if (o.successCriteria) s += ` (${o.successCriteria})`;
      s += "\n";
    });
    s += "\n";
  }

  if (project.userStories.length > 0) {
    s += `## User Stories\n`;
    project.userStories.forEach((st: { priority: string; role: string; capability: string; benefit: string }) => {
      s += `- [${st.priority}] As a ${st.role}, I want ${st.capability}`;
      if (st.benefit) s += `, so that ${st.benefit}`;
      s += "\n";
    });
    s += "\n";
  }

  for (const cat of project.requirementCategories) {
    s += `## ${cat.name} (${cat.type})\n`;
    for (const r of cat.requirements) {
      s += `- [${r.priority}] ${r.title}: ${r.description}\n`;
    }
    s += "\n";
  }

  if (project.processFlows.length > 0) {
    s += `## Process Flows\n`;
    project.processFlows.forEach((f: { name: string; flowType: string }) => {
      s += `- ${f.name} (${f.flowType})\n`;
    });
  }

  return s;
}
