import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { RequirementsTabs } from "@/modules/requirements/components/requirements-tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function RequirementsPage({
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
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: {
            orderBy: { sortOrder: "asc" },
            include: { metrics: true },
          },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const meta = project.meta ?? {
    visionStatement: "",
    businessContext: "",
    targetUsers: "",
    technicalConstraints: "",
    timeline: "",
    stakeholders: "",
    glossary: "",
  };

  const nfrCategories = project.requirementCategories.filter(
    (c) => c.type === "non_functional"
  );
  const constraintCategories = project.requirementCategories.filter(
    (c) => c.type !== "non_functional"
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Requirements</h2>
        <Link href={`/project/${project.id}/wizard`}>
          <Button variant="outline" size="sm">
            Re-enter Wizard
          </Button>
        </Link>
      </div>
      <RequirementsTabs
        projectId={project.id}
        meta={meta}
        objectives={project.objectives}
        userStories={project.userStories}
        nfrCategories={nfrCategories}
        constraintCategories={constraintCategories}
      />
    </div>
  );
}
