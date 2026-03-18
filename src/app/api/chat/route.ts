import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// GET: Load chat history for the current user + project
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

// DELETE: Clear chat history for the current user + project
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

// POST: Send a message, stream AI response, save both to DB
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

  // Save the user message
  await prisma.chatMessage.create({
    data: {
      projectId,
      userId: session.user.id,
      role: "user",
      content: message,
    },
  });

  // Load full conversation history from DB for context
  const history = await prisma.chatMessage.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  const context = buildProjectContext(project);

  const systemPrompt = `You are a helpful requirements analyst assistant. You have access to the full project requirements below and can answer questions about them, identify gaps, suggest improvements, clarify relationships between requirements, and help the user understand their project.

Be concise and specific. Reference actual items from the requirements when answering. If the user asks about something not covered in the requirements, say so clearly.

${context}`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponse += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Save the assistant response to DB after streaming completes
        await prisma.chatMessage.create({
          data: {
            projectId,
            userId: session.user.id,
            role: "assistant",
            content: fullResponse,
          },
        });

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
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
