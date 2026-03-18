"use client";

import { type SnapshotDiff, type DiffItemStatus, countChanges } from "../diff";

type ComparisonViewProps = {
  fromVersion: number;
  toVersion: number;
  diff: SnapshotDiff;
};

const STATUS_STYLES: Record<DiffItemStatus, { bg: string; text: string; label: string }> = {
  added: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", label: "Added" },
  modified: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "Modified" },
  removed: { bg: "bg-red-500/10 border-red-500/30 line-through opacity-60", text: "text-red-400", label: "Removed" },
  unchanged: { bg: "border-gray-800", text: "text-gray-500", label: "" },
};

export function ComparisonView({ fromVersion, toVersion, diff }: ComparisonViewProps) {
  const counts = countChanges(diff);
  const totalChanges = counts.added + counts.modified + counts.removed;
  const changedMeta = diff.meta.filter((m) => m.status !== "unchanged");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="rounded bg-muted px-2 py-1 text-sm font-mono">V{fromVersion}</span>
        <span className="text-gray-500">to</span>
        <span className="rounded bg-muted px-2 py-1 text-sm font-mono">V{toVersion}</span>
        <div className="flex items-center gap-3 ml-4 text-xs">
          {counts.added > 0 && <span className="text-green-400">+{counts.added} added</span>}
          {counts.modified > 0 && <span className="text-amber-400">~{counts.modified} modified</span>}
          {counts.removed > 0 && <span className="text-red-400">-{counts.removed} removed</span>}
          {totalChanges === 0 && <span className="text-gray-500">No changes</span>}
        </div>
      </div>

      {changedMeta.length > 0 && (
        <Section title="Meta">
          {changedMeta.map((m) => (
            <DiffCard key={m.key} status={m.status}>
              <p className="text-xs font-medium text-gray-300 mb-1">{m.label}</p>
              {m.status === "modified" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Before</p>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap">{m.before || <Blank />}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">After</p>
                    <p className="text-xs whitespace-pre-wrap">{m.after || <Blank />}</p>
                  </div>
                </div>
              )}
              {m.status === "added" && <p className="text-xs whitespace-pre-wrap">{m.after}</p>}
              {m.status === "removed" && <p className="text-xs text-gray-400 whitespace-pre-wrap">{m.before}</p>}
            </DiffCard>
          ))}
        </Section>
      )}

      <DiffList
        title="Objectives"
        items={diff.objectives.filter((d) => d.status !== "unchanged")}
        renderBefore={(item) => <p className="text-sm">{item.title}</p>}
        renderAfter={(item) => <p className="text-sm">{item.title}</p>}
        renderModified={(before, after) => (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">Before</p>
              <p className="text-sm text-gray-400">{before.title}</p>
              {before.successCriteria && <p className="text-xs text-gray-500 mt-0.5">{before.successCriteria}</p>}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">After</p>
              <p className="text-sm">{after.title}</p>
              {after.successCriteria && <p className="text-xs text-gray-400 mt-0.5">{after.successCriteria}</p>}
            </div>
          </div>
        )}
      />

      <DiffList
        title="User Stories"
        items={diff.userStories.filter((d) => d.status !== "unchanged")}
        renderBefore={(s) => (
          <p className="text-sm">As a <b>{s.role}</b>, I want <b>{s.capability}</b></p>
        )}
        renderAfter={(s) => (
          <p className="text-sm">As a <b>{s.role}</b>, I want <b>{s.capability}</b></p>
        )}
        renderModified={(before, after) => (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">Before</p>
              <p className="text-sm text-gray-400">As a {before.role}, I want {before.capability}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">After</p>
              <p className="text-sm">As a {after.role}, I want {after.capability}</p>
            </div>
          </div>
        )}
      />

      {diff.requirementCategories.filter((c) => c.status !== "unchanged").length > 0 && (
        <Section title="Requirements">
          {diff.requirementCategories
            .filter((c) => c.status !== "unchanged")
            .map((cat) => {
              const data = cat.after ?? cat.before;
              if (!data) return null;
              return (
                <div key={data.id} className="space-y-2">
                  <DiffCard status={cat.status}>
                    <p className="text-sm font-medium">{data.name}</p>
                  </DiffCard>
                  {data.requirements
                    .filter((r) => r.status !== "unchanged")
                    .map((req) => {
                      const rd = req.after ?? req.before;
                      if (!rd) return null;
                      return (
                        <div key={rd.id} className="ml-4">
                          <DiffCard status={req.status}>
                            <p className="text-sm">{rd.title}</p>
                            {rd.description && <p className="text-xs text-gray-400 mt-0.5">{rd.description}</p>}
                          </DiffCard>
                        </div>
                      );
                    })}
                </div>
              );
            })}
        </Section>
      )}

      <DiffList
        title="Process Flows"
        items={diff.processFlows.filter((d) => d.status !== "unchanged")}
        renderBefore={(f) => <p className="text-sm">{f.name} ({f.flowType})</p>}
        renderAfter={(f) => <p className="text-sm">{f.name} ({f.flowType})</p>}
        renderModified={(before, after) => (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">Before</p>
              <p className="text-sm text-gray-400">{before.name} ({before.flowType})</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">After</p>
              <p className="text-sm">{after.name} ({after.flowType})</p>
            </div>
          </div>
        )}
      />

      {totalChanges === 0 && (
        <p className="text-center text-gray-500 py-8">These versions are identical.</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-300 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DiffCard({ status, children }: { status: DiffItemStatus; children: React.ReactNode }) {
  const style = STATUS_STYLES[status];
  return (
    <div className={`rounded-md border p-3 ${style.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">{children}</div>
        {style.label && (
          <span className={`shrink-0 text-xs font-medium ${style.text}`}>{style.label}</span>
        )}
      </div>
    </div>
  );
}

function DiffList<T>({
  title,
  items,
  renderBefore,
  renderAfter,
  renderModified,
}: {
  title: string;
  items: { status: DiffItemStatus; before?: T; after?: T }[];
  renderBefore: (item: T) => React.ReactNode;
  renderAfter: (item: T) => React.ReactNode;
  renderModified: (before: T, after: T) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      {items.map((item, i) => (
        <DiffCard key={i} status={item.status}>
          {item.status === "modified" && item.before && item.after
            ? renderModified(item.before, item.after)
            : item.status === "added" && item.after
              ? renderAfter(item.after)
              : item.before
                ? renderBefore(item.before)
                : null}
        </DiffCard>
      ))}
    </Section>
  );
}

function Blank() {
  return <span className="text-gray-600 italic">empty</span>;
}
