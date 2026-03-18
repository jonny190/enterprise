import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RevisionsList } from "@/modules/versions/components/revisions-list";

export default async function RevisionsPage({
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
        orderBy: { revisionNumber: "asc" },
        include: {
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  return (
    <div className="p-4">
      <RevisionsList
        projectId={id}
        revisions={project.revisions.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
