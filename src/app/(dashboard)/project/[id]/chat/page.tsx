import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChatPanel } from "@/modules/chat/components/chat-panel";

export default async function ChatPage({
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
    <div className="p-8 max-w-3xl">
      <h2 className="mb-4 text-xl font-semibold">Chat with Requirements</h2>
      <ChatPanel projectId={id} />
    </div>
  );
}
