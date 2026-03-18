import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { CreateProjectDialog } from "@/modules/projects/components/create-project-dialog";
import Link from "next/link";

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
          <CreateProjectDialog orgId={org.id} />
        </div>
        {org.projects.length === 0 ? (
          <p className="text-sm text-gray-400">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}/wizard`}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{project.name}</h3>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    {project.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  {project.description || "No description"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
