import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Public endpoint - authenticated by project API key
// POST /api/errors/ingest
// Headers: x-api-key: <project-api-key>
// Body: { title, stackTrace?, context?, source? }
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json({ error: "Missing x-api-key header" }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { apiKey, deletedAt: null },
  });

  if (!project) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: { title?: string; stackTrace?: string; context?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title || typeof body.title !== "string") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const errorLog = await prisma.errorLog.create({
    data: {
      projectId: project.id,
      title: body.title.slice(0, 500),
      stackTrace: (body.stackTrace || "").slice(0, 10000),
      context: (body.context || "").slice(0, 2000),
      source: (body.source || "api").slice(0, 200),
      createdById: project.createdById,
    },
  });

  return Response.json({
    id: errorLog.id,
    status: errorLog.status,
    createdAt: errorLog.createdAt.toISOString(),
  }, { status: 201 });
}
