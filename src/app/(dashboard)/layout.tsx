import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgRail } from "@/components/layout/org-rail";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const orgs = await prisma.organization.findMany({
    where: {
      memberships: { some: { userId: session.user.id } },
    },
    orderBy: { name: "asc" },
  });

  // If user has no orgs, redirect to create one
  if (orgs.length === 0) {
    // We'll handle this with a create-org page in the dashboard
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <OrgRail orgs={orgs} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
