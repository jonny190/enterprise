import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSettingsClient } from "@/modules/projects/components/project-settings-client";

export default async function ProjectSettingsPage({
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
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const membership = project.org.memberships[0];

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Project Settings</h2>
      <ProjectSettingsClient
        projectId={project.id}
        projectName={project.name}
        projectStatus={project.status}
        gitRepo={project.gitRepo}
        orgSlug={project.org.slug}
        userRole={membership.role}
        isCreator={project.createdById === session.user.id}
      />
    </div>
  );
}
