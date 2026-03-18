import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { OrgSettingsForm } from "@/modules/orgs/components/org-settings-form";
import { BrandSettings } from "@/modules/orgs/components/brand-settings";
import { GitHubTokenSettings } from "@/modules/orgs/components/github-token-settings";

export default async function OrgSettingsPage({
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
        select: { id: true, name: true, status: true },
      },
    },
  });

  if (!org || org.memberships.length === 0) notFound();

  const isOwner = org.memberships[0].role === "owner";

  if (!isOwner) {
    return (
      <>
        <ProjectSidebar
          orgSlug={org.slug}
          orgName={org.name}
          projects={org.projects}
        />
        <div className="flex-1 p-8">
          <p className="text-sm text-gray-400">
            Only organization owners can manage settings.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ProjectSidebar
        orgSlug={org.slug}
        orgName={org.name}
        projects={org.projects}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <h2 className="mb-6 text-xl font-semibold">Organization Settings</h2>
        <div className="space-y-10 max-w-lg">
          <OrgSettingsForm orgId={org.id} orgName={org.name} />
          <div className="border-t border-gray-800 pt-8">
            <BrandSettings
              orgId={org.id}
              initialBrand={{
                website: org.website,
                logoUrl: org.logoUrl,
                faviconUrl: org.faviconUrl,
                brandColors: org.brandColors,
                brandTone: org.brandTone,
                brandDescription: org.brandDescription,
              }}
            />
          </div>
          <div className="border-t border-gray-800 pt-8">
            <GitHubTokenSettings orgId={org.id} hasToken={!!org.githubToken} />
          </div>
        </div>
      </div>
    </>
  );
}
