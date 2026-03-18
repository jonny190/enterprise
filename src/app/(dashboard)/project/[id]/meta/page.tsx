import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MetaEditor } from "@/modules/requirements/components/meta-editor";

export default async function MetaPage({
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
      meta: true,
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Project Metadata</h2>
      <MetaEditor projectId={project.id} meta={project.meta} />
    </div>
  );
}
