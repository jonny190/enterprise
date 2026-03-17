import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveProjectState } from "@/lib/revisions";
import { RevisionEditor } from "@/components/revisions/revision-editor";

export default async function RevisionEditorPage({
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
    include: {
      changes: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!revision || revision.projectId !== id) redirect(`/project/${id}/revisions`);

  const resolvedState = await resolveProjectState(
    id,
    revision.status === "finalized" ? revision.revisionNumber : revision.revisionNumber - 1,
    revision.status === "draft" ? revision.id : null
  );

  return (
    <RevisionEditor
      revisionId={revisionId}
      projectId={id}
      revisionNumber={revision.revisionNumber}
      title={revision.title}
      status={revision.status}
      resolvedState={resolvedState}
      changes={revision.changes.map((c) => ({
        id: c.id,
        changeType: c.changeType,
        targetType: c.targetType,
        targetId: c.targetId,
        data: c.data as Record<string, unknown>,
      }))}
    />
  );
}
