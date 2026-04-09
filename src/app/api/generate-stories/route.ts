import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStories } from "@/modules/wizard/lib/generate-stories";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await req.json();

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const stories = await generateStories({
      businessContext: project.meta?.businessContext || "",
      targetUsers: project.meta?.targetUsers || "",
      technicalConstraints: project.meta?.technicalConstraints || "",
      visionStatement: project.meta?.visionStatement || "",
      objectives: project.objectives.map((o) => ({
        title: o.title,
        successCriteria: o.successCriteria,
      })),
    });

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Story generation failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate user stories. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
