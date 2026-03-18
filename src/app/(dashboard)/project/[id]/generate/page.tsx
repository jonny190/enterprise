import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { GenerationPreview } from "@/modules/generation/components/generation-preview";

export default async function GeneratePage({
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
      revisions: {
        where: { status: "finalized" },
        orderBy: { revisionNumber: "asc" },
        select: { revisionNumber: true, title: true, status: true },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Generate Output</h2>
      <GenerationPreview projectId={project.id} revisions={project.revisions} />
    </div>
  );
}
