import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { CreateProjectDialog } from "@/modules/projects/components/create-project-dialog";
import { OrgDashboard } from "@/modules/projects/components/org-dashboard";

export default async function OrgProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: { where: { userId: session.user.id } },
      projects: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: {
              objectives: true,
              userStories: true,
              requirementCategories: true,
              revisions: true,
              generatedOutputs: true,
            },
          },
        },
      },
    },
  });

  if (!org || org.memberships.length === 0) notFound();

  return (
    <>
      <ProjectSidebar
        orgSlug={org.slug}
        orgName={org.name}
        projects={org.projects}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Projects</h2>
          <CreateProjectDialog orgId={org.id} hasGithubToken={!!org.githubToken} />
        </div>
        <OrgDashboard
          projects={org.projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            gitRepo: p.gitRepo,
            updatedAt: p.updatedAt.toISOString(),
            _count: p._count,
          }))}
        />
      </div>
    </>
  );
}
