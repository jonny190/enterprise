import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "@/modules/orgs/components/create-org-form";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const showCreate = params.create === "1";

  const orgs = await prisma.organization.findMany({
    where: {
      memberships: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { projects: true } },
    },
  });

  if (orgs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md space-y-6 p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Welcome to Enterprise</h2>
            <p className="text-sm text-gray-400">
              Create your first organization to get started.
            </p>
          </div>
          <CreateOrgForm />
        </div>
      </div>
    );
  }

  const recentProjects = await prisma.project.findMany({
    where: {
      org: { memberships: { some: { userId: session.user.id } } },
      deletedAt: null,
    },
    include: { org: { select: { name: true, slug: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {showCreate && (
        <div className="mb-8 mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Create Organization</h2>
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              Cancel
            </Link>
          </div>
          <CreateOrgForm />
        </div>
      )}

      {!showCreate && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Organizations</h2>
            <Link
              href="/dashboard?create=1"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Organization
            </Link>
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.slug}/projects`}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
              >
                <h3 className="font-medium">{org.name}</h3>
                <p className="mt-1 text-xs text-gray-400">
                  {org._count.projects} project{org._count.projects !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>

          <h2 className="mb-4 text-xl font-semibold">Recent Projects</h2>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-gray-400">
              No projects yet. Select an organization to create one.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}/wizard`}
                  className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
                >
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {project.org.name}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {project.description || "No description"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
