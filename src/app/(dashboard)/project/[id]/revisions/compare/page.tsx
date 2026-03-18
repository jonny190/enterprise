import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type VersionSnapshot } from "@/modules/versions/lib";
import { diffSnapshots } from "@/modules/versions/diff";
import { ComparisonView } from "@/modules/versions/components/comparison-view";
import Link from "next/link";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      revisions: {
        orderBy: { revisionNumber: "asc" },
        select: { revisionNumber: true, title: true, snapshot: true },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) redirect("/dashboard");

  const fromNum = from ? parseInt(from) : null;
  const toNum = to ? parseInt(to) : null;

  const fromRevision = fromNum ? project.revisions.find((r) => r.revisionNumber === fromNum) : null;
  const toRevision = toNum ? project.revisions.find((r) => r.revisionNumber === toNum) : null;

  const hasBoth = fromRevision && toRevision;
  const diff = hasBoth
    ? diffSnapshots(
        fromRevision.snapshot as unknown as VersionSnapshot,
        toRevision.snapshot as unknown as VersionSnapshot
      )
    : null;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Compare Versions</h2>
        <Link
          href={`/project/${id}/revisions`}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          Back to Versions
        </Link>
      </div>

      {project.revisions.length < 2 ? (
        <p className="text-sm text-gray-400">
          You need at least 2 versions to compare. Create more versions to use this feature.
        </p>
      ) : (
        <div className="space-y-6">
          <CompareSelector
            projectId={id}
            versions={project.revisions.map((r) => ({
              number: r.revisionNumber,
              title: r.title,
            }))}
            fromNum={fromNum}
            toNum={toNum}
          />

          {diff && fromNum && toNum && (
            <ComparisonView fromVersion={fromNum} toVersion={toNum} diff={diff} />
          )}

          {!hasBoth && project.revisions.length >= 2 && (
            <p className="text-sm text-gray-500">Select two versions above to compare.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CompareSelector({
  projectId,
  versions,
  fromNum,
  toNum,
}: {
  projectId: string;
  versions: { number: number; title: string }[];
  fromNum: number | null;
  toNum: number | null;
}) {
  return (
    <form className="flex items-center gap-3" method="GET">
      <label className="text-sm text-gray-400">From:</label>
      <select
        name="from"
        defaultValue={fromNum ?? ""}
        className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm"
      >
        <option value="">Select version</option>
        {versions.map((v) => (
          <option key={v.number} value={v.number}>
            V{v.number}: {v.title}
          </option>
        ))}
      </select>
      <label className="text-sm text-gray-400">To:</label>
      <select
        name="to"
        defaultValue={toNum ?? ""}
        className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm"
      >
        <option value="">Select version</option>
        {versions.map((v) => (
          <option key={v.number} value={v.number}>
            V{v.number}: {v.title}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Compare
      </button>
    </form>
  );
}
