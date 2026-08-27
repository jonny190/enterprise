import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { type TextBlock, type ToolUseBlock, type ToolResultBlockParam, type MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { type Priority } from "@prisma/client";

const client = new Anthropic();

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "add_objective",
    description: "Add a new objective to the project. Use when the user asks to add an objective or goal.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "The objective title" },
        successCriteria: { type: "string", description: "How success will be measured" },
      },
      required: ["title"],
    },
  },
  {
    name: "add_user_story",
    description: "Add a new user story. Use when the user describes a feature need or says 'as a X I want Y'.",
    input_schema: {
      type: "object" as const,
      properties: {
        role: { type: "string", description: "The user role (e.g. 'admin', 'customer')" },
        capability: { type: "string", description: "What the user wants to do" },
        benefit: { type: "string", description: "Why they want it" },
        priority: { type: "string", enum: ["must", "should", "could", "wont"], description: "MoSCoW priority" },
      },
      required: ["role", "capability"],
    },
  },
  {
    name: "add_requirement",
    description: "Add a non-functional requirement. Use when the user mentions performance, security, scalability, or other quality requirements.",
    input_schema: {
      type: "object" as const,
      properties: {
        categoryName: { type: "string", description: "NFR category (e.g. 'Performance', 'Security')" },
        title: { type: "string", description: "Requirement title" },
        description: { type: "string", description: "Detailed description" },
        priority: { type: "string", enum: ["must", "should", "could", "wont"], description: "MoSCoW priority" },
      },
      required: ["categoryName", "title"],
    },
  },
  {
    name: "update_meta",
    description: "Update project metadata fields like vision statement, business context, target users, timeline, technical constraints, stakeholders, or glossary.",
    input_schema: {
      type: "object" as const,
      properties: {
        field: {
          type: "string",
          enum: ["visionStatement", "businessContext", "targetUsers", "technicalConstraints", "timeline", "stakeholders", "glossary"],
          description: "Which meta field to update",
        },
        value: { type: "string", description: "The new value" },
      },
      required: ["field", "value"],
    },
  },
];

// GET: Load chat history
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return Response.json({ error: "Missing projectId" }, { status: 400 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true, createdAt: true },
  });

  return Response.json({ messages });
}

// DELETE: Clear chat history
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return Response.json({ error: "Missing projectId" }, { status: 400 });
  }

  await prisma.chatMessage.deleteMany({
    where: { projectId, userId: session.user.id },
  });

  return Response.json({ success: true });
}

// POST: Send a message with tool-calling support
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId, message } = await req.json();

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
          requirements: {
            orderBy: { sortOrder: "asc" },
            include: { metrics: true },
          },
        },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { projectId, userId: session.user.id, role: "user", content: message },
  });

  // Load history
  const history = await prisma.chatMessage.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  const context = buildProjectContext(project);

  const systemPrompt = `You are a helpful requirements analyst assistant with the ability to modify the project. You have access to the full project requirements below and can:
- Answer questions about the requirements
- Add new objectives, user stories, and requirements when asked
- Update project metadata (vision, business context, etc.)

When the user asks you to add something, use the appropriate tool. After using a tool, confirm what you added. Be concise and specific.

${context}`;

  const apiMessages: MessageParam[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Tool-use loop: keep calling until we get a final text response
  let finalText = "";
  const toolActions: string[] = [];
  let currentMessages = [...apiMessages];
  let iterations = 0;
  const maxIterations = 5;

  try {
    while (iterations < maxIterations) {
      iterations++;

      const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 4096,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
      });

      // Collect text blocks
      const textBlocks = response.content.filter((b): b is TextBlock => b.type === "text");
      const toolBlocks = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");

      if (textBlocks.length > 0) {
        finalText += textBlocks.map((b) => b.text).join("");
      }

      // If no tool calls, we're done
      if (toolBlocks.length === 0 || response.stop_reason !== "tool_use") {
        break;
      }

      // Execute tool calls
      const toolResults: ToolResultBlockParam[] = [];
      for (const tool of toolBlocks) {
        const result = await executeTool(tool.name, tool.input as Record<string, string>, projectId);
        toolActions.push(result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: result,
        });
      }

      // Add assistant response + tool results to conversation for next iteration
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    }
  } catch (error) {
    // Without this the whole route rejects: the user's message is already
    // persisted, so the failure would surface as an unlogged 500 and leave a
    // message in the history with no reply.
    console.error("[chat] completion failed", error);
    return Response.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 500 }
    );
  }

  // Build the response text including tool action confirmations
  if (toolActions.length > 0 && !finalText) {
    finalText = toolActions.join("\n\n");
  }

  // Save assistant response
  await prisma.chatMessage.create({
    data: { projectId, userId: session.user.id, role: "assistant", content: finalText },
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(finalText));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function executeTool(
  name: string,
  input: Record<string, string>,
  projectId: string
): Promise<string> {
  try {
    switch (name) {
      case "add_objective": {
        const maxSort = await prisma.objective.aggregate({
          where: { projectId },
          _max: { sortOrder: true },
        });
        await prisma.objective.create({
          data: {
            projectId,
            title: input.title,
            successCriteria: input.successCriteria || "",
            sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          },
        });
        return `Added objective: "${input.title}"`;
      }

      case "add_user_story": {
        const maxSort = await prisma.userStory.aggregate({
          where: { projectId },
          _max: { sortOrder: true },
        });
        await prisma.userStory.create({
          data: {
            projectId,
            role: input.role,
            capability: input.capability,
            benefit: input.benefit || "",
            priority: (input.priority || "should") as Priority,
            sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          },
        });
        return `Added user story: "As a ${input.role}, I want ${input.capability}"`;
      }

      case "add_requirement": {
        // Find or create the category
        let category = await prisma.requirementCategory.findFirst({
          where: { projectId, name: input.categoryName },
        });
        if (!category) {
          const maxCatSort = await prisma.requirementCategory.aggregate({
            where: { projectId },
            _max: { sortOrder: true },
          });
          category = await prisma.requirementCategory.create({
            data: {
              projectId,
              name: input.categoryName,
              type: "non_functional",
              sortOrder: (maxCatSort._max.sortOrder ?? 0) + 1,
            },
          });
        }
        const maxReqSort = await prisma.requirement.aggregate({
          where: { categoryId: category.id },
          _max: { sortOrder: true },
        });
        await prisma.requirement.create({
          data: {
            categoryId: category.id,
            title: input.title,
            description: input.description || "",
            priority: (input.priority || "should") as Priority,
            sortOrder: (maxReqSort._max.sortOrder ?? 0) + 1,
          },
        });
        return `Added requirement "${input.title}" under ${input.categoryName}`;
      }

      case "update_meta": {
        const field = input.field;
        const validFields = [
          "visionStatement", "businessContext", "targetUsers",
          "technicalConstraints", "timeline", "stakeholders", "glossary",
        ];
        if (!validFields.includes(field)) {
          return `Invalid meta field: ${field}`;
        }
        await prisma.projectMeta.upsert({
          where: { projectId },
          create: { projectId, [field]: input.value },
          update: { [field]: input.value },
        });
        const label = field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
        return `Updated ${label.toLowerCase()}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Failed to execute ${name}: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProjectContext(project: any): string {
  let ctx = `# Project: ${project.name}\n${project.description}\n\n`;

  const meta = project.meta;
  if (meta) {
    if (meta.visionStatement) ctx += `## Vision\n${meta.visionStatement}\n\n`;
    if (meta.businessContext) ctx += `## Business Context\n${meta.businessContext}\n\n`;
    if (meta.targetUsers) ctx += `## Target Users\n${meta.targetUsers}\n\n`;
    if (meta.technicalConstraints) ctx += `## Technical Constraints\n${meta.technicalConstraints}\n\n`;
    if (meta.timeline) ctx += `## Timeline\n${meta.timeline}\n\n`;
    if (meta.stakeholders) ctx += `## Stakeholders\n${meta.stakeholders}\n\n`;
    if (meta.glossary) ctx += `## Glossary\n${meta.glossary}\n\n`;
  }

  if (project.objectives.length > 0) {
    ctx += `## Objectives (${project.objectives.length})\n`;
    project.objectives.forEach((o: { title: string; successCriteria: string }, i: number) => {
      ctx += `${i + 1}. ${o.title}`;
      if (o.successCriteria) ctx += ` -- Success: ${o.successCriteria}`;
      ctx += "\n";
    });
    ctx += "\n";
  }

  if (project.userStories.length > 0) {
    ctx += `## User Stories (${project.userStories.length})\n`;
    project.userStories.forEach((s: { priority: string; role: string; capability: string; benefit: string }, i: number) => {
      ctx += `${i + 1}. [${s.priority}] As a ${s.role}, I want ${s.capability}`;
      if (s.benefit) ctx += `, so that ${s.benefit}`;
      ctx += "\n";
    });
    ctx += "\n";
  }

  for (const cat of project.requirementCategories) {
    ctx += `## ${cat.name} (${cat.type})\n`;
    for (const req of cat.requirements) {
      ctx += `- [${req.priority}] ${req.title}: ${req.description}\n`;
      for (const m of req.metrics) {
        ctx += `  - ${m.metricName}: ${m.targetValue} ${m.unit}\n`;
      }
    }
    ctx += "\n";
  }

  if (project.processFlows.length > 0) {
    ctx += `## Process Flows (${project.processFlows.length})\n`;
    project.processFlows.forEach((f: { name: string; flowType: string }) => {
      ctx += `- ${f.name} (${f.flowType})\n`;
    });
    ctx += "\n";
  }

  return ctx;
}
