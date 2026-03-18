import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { SlideDeck } from "@/modules/slides/components/slide-deck";

export default async function SlidesPage({
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

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Slide Deck</h2>
      <SlideDeck projectId={id} />
    </div>
  );
}
