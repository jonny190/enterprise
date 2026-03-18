import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type VersionSnapshot } from "@/modules/versions/lib";
import { VersionViewer } from "@/modules/versions/components/revision-editor";

export default async function VersionViewPage({
  params,
}: {
  params: Promise<{ id: string; revisionId: string }>;
}) {
  const { id, revisionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
  });

  if (!revision || revision.projectId !== id) redirect(`/project/${id}/revisions`);

  const snapshot = revision.snapshot as unknown as VersionSnapshot;

  return (
    <VersionViewer
      projectId={id}
      revisionNumber={revision.revisionNumber}
      title={revision.title}
      createdAt={revision.createdAt.toISOString()}
      snapshot={snapshot}
    />
  );
}
