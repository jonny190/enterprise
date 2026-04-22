import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOutput } from "@/modules/generation/lib/generate";
import { type VersionSnapshot } from "@/modules/versions/lib";
import { fetchRepoContext, formatRepoContext } from "@/modules/generation/lib/repo-context";
import { diffSnapshots } from "@/modules/versions/diff";
import { formatDiffForPrompt } from "@/modules/generation/lib/diff-context";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId, outputType, revisionNumber, changesOnly } = await req.json();

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
        include: {
          requirements: {
            include: { metrics: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const org = project.org;
    const brand =
      org.brandColors || org.brandTone || org.brandDescription
        ? {
            colors: org.brandColors,
            tone: org.brandTone,
            description: org.brandDescription,
          }
        : null;

    // Fetch repo context if a git repo is linked
    const repoUrl = project.gitRepo || undefined;
    let repoContext: string | undefined;
    if (repoUrl) {
      const ctx = await fetchRepoContext(repoUrl);
      if (ctx) repoContext = formatRepoContext(ctx);
    }

    // If a version is selected, generate from the revision's snapshot
    if (revisionNumber) {
      const revision = await prisma.revision.findFirst({
        where: { projectId, revisionNumber },
      });

      if (!revision) {
        return new Response("Version not found", { status: 404 });
      }

      const snap = revision.snapshot as unknown as VersionSnapshot;

      // Compute diff against previous version if one exists
      let diffContext: string | undefined;
      if (revisionNumber > 1) {
        const prevRevision = await prisma.revision.findFirst({
          where: { projectId, revisionNumber: revisionNumber - 1 },
        });
        if (prevRevision) {
          const prevSnap = prevRevision.snapshot as unknown as VersionSnapshot;
          const diff = diffSnapshots(prevSnap, snap);
          const formatted = formatDiffForPrompt(diff, revisionNumber - 1, revisionNumber);
          if (formatted) diffContext = formatted;
        }
      }

      const stream = await generateOutput(outputType, {
        name: project.name,
        description: project.description,
        gitRepo: snap.gitRepo,
        repoContext,
        diffContext,
        changesOnly: !!changesOnly && !!diffContext,
        meta: snap.meta,
        brand,
        objectives: snap.objectives.map((o) => ({ title: o.title, successCriteria: o.successCriteria })),
        userStories: snap.userStories.map((s) => ({ role: s.role, capability: s.capability, benefit: s.benefit, priority: s.priority })),
        nfrCategories: snap.requirementCategories
          .filter((c) => c.type === "non_functional")
          .map((c) => ({
            name: c.name,
            requirements: c.requirements.map((r) => ({
              title: r.title,
              description: r.description,
              priority: r.priority,
              metrics: r.metrics,
            })),
          })),
        constraints: snap.requirementCategories
          .filter((c) => c.type !== "non_functional")
          .map((c) => ({
            type: c.type,
            name: c.name,
            requirements: c.requirements.map((r) => ({
              title: r.title,
              description: r.description,
            })),
          })),
        processFlows: snap.processFlows.map((f) => ({
          name: f.name,
          flowType: f.flowType,
          diagramData: f.diagramData as {
            nodes: { id: string; type: string; data: { label: string } }[];
            edges: { source: string; target: string; label?: string }[];
          },
        })),
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Default: generate from current (live) project data
    // If changesOnly, diff against the latest version
    let currentDiffContext: string | undefined;
    if (changesOnly) {
      const latestVersion = await prisma.revision.findFirst({
        where: { projectId },
        orderBy: { revisionNumber: "desc" },
      });
      if (latestVersion) {
        const { snapshotProjectState } = await import("@/modules/versions/lib");
        const currentSnap = await snapshotProjectState(projectId);
        const prevSnap = latestVersion.snapshot as unknown as VersionSnapshot;
        const diff = diffSnapshots(prevSnap, currentSnap);
        const formatted = formatDiffForPrompt(diff, latestVersion.revisionNumber, latestVersion.revisionNumber + 1);
        if (formatted) currentDiffContext = formatted;
      }
    }

    const stream = await generateOutput(outputType, {
      name: project.name,
      description: project.description,
      gitRepo: project.gitRepo || undefined,
      repoContext,
      diffContext: currentDiffContext,
      changesOnly: !!changesOnly && !!currentDiffContext,
      meta: project.meta || null,
      brand,
      objectives: project.objectives,
      userStories: project.userStories,
      nfrCategories: project.requirementCategories
        .filter((c) => c.type === "non_functional")
        .map((c) => ({
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
            metrics: r.metrics,
          })),
        })),
      constraints: project.requirementCategories
        .filter((c) => c.type !== "non_functional")
        .map((c) => ({
          type: c.type,
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
          })),
        })),
      processFlows: project.processFlows.map((f) => ({
        name: f.name,
        flowType: f.flowType,
        diagramData: f.diagramData as {
          nodes: { id: string; type: string; data: { label: string } }[];
          edges: { source: string; target: string; label?: string }[];
        },
      })),
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Generation failed:", error);
    return new Response("Generation failed", { status: 500 });
  }
}
