import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ErrorList } from "@/modules/errors/components/error-list";

export default async function ErrorsPage({
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
      errorLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true } },
          notes: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true } } },
          },
          prs: {
            orderBy: { createdAt: "asc" },
            include: { addedBy: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <div className="p-8">
      <ErrorList
        projectId={id}
        apiKey={project.apiKey}
        hasGithubToken={!!project.org.githubToken}
        hasGitRepo={!!project.gitRepo}
        errors={project.errorLogs.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
          notes: e.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
          prs: e.prs.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
        }))}
      />
    </div>
  );
}
