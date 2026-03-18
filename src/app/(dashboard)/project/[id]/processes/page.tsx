import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessesClient } from "@/modules/processes/components/processes-client";

export default async function ProcessesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  const flows = project.processFlows.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    flowType: f.flowType,
    diagramData: (f.diagramData as { nodes: []; edges: [] }) ?? {
      nodes: [],
      edges: [],
    },
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Process Flows</h1>
      <ProcessesClient projectId={id} flows={flows} />
    </div>
  );
}
