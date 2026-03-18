import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { MemberList } from "@/modules/orgs/components/member-list";
import { InviteForm } from "@/modules/orgs/components/invite-form";

export default async function OrgMembersPage({
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
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      invitations: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
      projects: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!org) notFound();

  const currentMembership = org.memberships.find(
    (m) => m.userId === session.user.id
  );
  if (!currentMembership) notFound();

  const canManage =
    currentMembership.role === "owner" || currentMembership.role === "admin";

  return (
    <>
      <ProjectSidebar
        orgSlug={org.slug}
        orgName={org.name}
        projects={org.projects}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="mb-6 text-xl font-semibold">Members</h2>
        {canManage && (
          <div className="mb-6">
            <InviteForm orgId={org.id} />
          </div>
        )}
        <MemberList
          orgId={org.id}
          members={org.memberships.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user,
          }))}
          invitations={org.invitations}
          currentUserRole={currentMembership.role}
          currentUserId={session.user.id}
        />
      </div>
    </>
  );
}
