import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buildFlowGenerationPrompt } from "@/modules/generation/lib/prompts";
import { generateStructuredJSON } from "@/modules/generation/lib/generate";
import * as dagre from "dagre";

function layoutNodes(
  nodes: { id: string; type: string; data: { label: string } }[],
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[]
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    const width = node.type === "decision" ? 160 : 180;
    const height = node.type === "decision" ? 80 : 40;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - (pos.width ?? 150) / 2,
        y: pos.y - (pos.height ?? 50) / 2,
      },
    };
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await request.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: {
          memberships: { where: { userId: session.user.id } },
        },
      },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prompt = buildFlowGenerationPrompt({
    name: project.name,
    description: project.description,
    meta: {
      visionStatement: project.meta?.visionStatement ?? "",
      businessContext: project.meta?.businessContext ?? "",
      targetUsers: project.meta?.targetUsers ?? "",
    },
    objectives: project.objectives.map((o) => ({
      title: o.title,
      successCriteria: o.successCriteria,
    })),
    userStories: project.userStories.map((s) => ({
      role: s.role,
      capability: s.capability,
      benefit: s.benefit,
    })),
  });

  try {
    const raw = await generateStructuredJSON(prompt);
    const parsed = JSON.parse(raw);
    const nodes = parsed.nodes ?? [];
    const nodeTypeMap = new Map(
      nodes.map((n: { id: string; type: string }) => [n.id, n.type])
    );
    const edges = (
      parsed.edges ?? []
    ).map(
      (
        e: {
          id?: string;
          source: string;
          target: string;
          sourceHandle?: string;
          label?: string;
        },
        i: number
      ) => {
        const sourceType = nodeTypeMap.get(e.source);
        let sourceHandle = e.sourceHandle;

        // Map edge labels to decision node handles
        if (sourceType === "decision" && !sourceHandle) {
          const labelLower = (e.label ?? "").toLowerCase().trim();
          if (labelLower === "yes" || labelLower === "true") {
            sourceHandle = "yes";
          } else if (labelLower === "no" || labelLower === "false") {
            sourceHandle = "no";
          }
        }

        return {
          id: e.id ?? `edge-${i}`,
          source: e.source,
          target: e.target,
          sourceHandle,
          label: e.label,
        };
      }
    );
    const laidOutNodes = layoutNodes(nodes, edges);
    return NextResponse.json({ nodes: laidOutNodes, edges });
  } catch (error) {
    console.error("Failed to generate flow:", error);
    return NextResponse.json(
      { error: "Failed to generate flow" },
      { status: 500 }
    );
  }
}
