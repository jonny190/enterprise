import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "@/components/org/create-org-form";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

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
      <h2 className="mb-6 text-xl font-semibold">Recent Projects</h2>
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
    </div>
  );
}
