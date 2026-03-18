import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PriorityMatrix } from "@/modules/requirements/components/priority-matrix";

export default async function PrioritiesPage({
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
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const requirements = project.requirementCategories.flatMap((cat) =>
    cat.requirements.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      categoryName: cat.name,
    }))
  );

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Priority Matrix</h2>
      <PriorityMatrix
        userStories={project.userStories.map((s) => ({
          id: s.id,
          role: s.role,
          capability: s.capability,
          benefit: s.benefit,
          priority: s.priority,
        }))}
        requirements={requirements}
      />
    </div>
  );
}
