import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { WizardClient } from "@/components/wizard/wizard-client";

export default async function WizardPage({
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
        include: {
          requirements: {
            include: { metrics: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
      wizardState: true,
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const wizardState = project.wizardState || {
    currentStep: 1,
    completedSteps: [],
  };

  return (
    <WizardClient
      projectId={project.id}
      initialStep={wizardState.currentStep}
      initialCompletedSteps={wizardState.completedSteps as number[]}
      meta={
        project.meta || {
          businessContext: "",
          visionStatement: "",
          targetUsers: "",
          technicalConstraints: "",
          timeline: "",
          stakeholders: "",
          glossary: "",
        }
      }
      objectives={project.objectives}
      userStories={project.userStories}
      nfrCategories={project.requirementCategories
        .filter((c) => c.type === "non_functional")
        .map((c) => ({
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
            metrics: r.metrics,
          })),
        }))}
      constraintItems={project.requirementCategories
        .filter((c) => c.type !== "non_functional")
        .map((c) => ({
          type: c.type as "constraint" | "assumption" | "dependency",
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
          })),
        }))}
      processFlows={project.processFlows}
    />
  );
}
