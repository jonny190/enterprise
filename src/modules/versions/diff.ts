import { type VersionSnapshot } from "./lib";

export type DiffItemStatus = "added" | "removed" | "modified" | "unchanged";

export type DiffItem<T> = {
  status: DiffItemStatus;
  before?: T;
  after?: T;
};

export type SnapshotDiff = {
  meta: { key: string; label: string; status: DiffItemStatus; before: string; after: string }[];
  objectives: DiffItem<{ id: string; title: string; successCriteria: string }>[];
  userStories: DiffItem<{ id: string; role: string; capability: string; benefit: string; priority: string }>[];
  requirementCategories: DiffItem<{
    id: string; type: string; name: string;
    requirements: DiffItem<{ id: string; title: string; description: string; priority: string }>[];
  }>[];
  processFlows: DiffItem<{ id: string; name: string; flowType: string }>[];
};

const META_FIELDS: { key: string; label: string }[] = [
  { key: "visionStatement", label: "Vision Statement" },
  { key: "businessContext", label: "Business Context" },
  { key: "targetUsers", label: "Target Users" },
  { key: "technicalConstraints", label: "Technical Constraints" },
  { key: "timeline", label: "Timeline" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "glossary", label: "Glossary" },
];

export function diffSnapshots(from: VersionSnapshot, to: VersionSnapshot): SnapshotDiff {
  return {
    meta: diffMeta(from.meta, to.meta),
    objectives: diffById(from.objectives, to.objectives, objectiveEqual),
    userStories: diffById(from.userStories, to.userStories, storyEqual),
    requirementCategories: diffCategories(from.requirementCategories, to.requirementCategories),
    processFlows: diffById(from.processFlows, to.processFlows, flowEqual),
  };
}

function diffMeta(from: VersionSnapshot["meta"], to: VersionSnapshot["meta"]) {
  return META_FIELDS.map((f) => {
    const before = (from as Record<string, string>)[f.key] ?? "";
    const after = (to as Record<string, string>)[f.key] ?? "";
    const status: DiffItemStatus =
      before === after ? "unchanged" : !before ? "added" : !after ? "removed" : "modified";
    return { key: f.key, label: f.label, status, before, after };
  });
}

function diffById<T extends { id: string }>(
  fromList: T[],
  toList: T[],
  isEqual: (a: T, b: T) => boolean
): DiffItem<T>[] {
  const result: DiffItem<T>[] = [];
  const toMap = new Map(toList.map((i) => [i.id, i]));
  const fromMap = new Map(fromList.map((i) => [i.id, i]));

  for (const item of fromList) {
    const match = toMap.get(item.id);
    if (!match) {
      result.push({ status: "removed", before: item });
    } else if (!isEqual(item, match)) {
      result.push({ status: "modified", before: item, after: match });
    } else {
      result.push({ status: "unchanged", before: item, after: match });
    }
  }

  for (const item of toList) {
    if (!fromMap.has(item.id)) {
      result.push({ status: "added", after: item });
    }
  }

  return result;
}

function diffCategories(
  fromCats: VersionSnapshot["requirementCategories"],
  toCats: VersionSnapshot["requirementCategories"]
): SnapshotDiff["requirementCategories"] {
  const result: SnapshotDiff["requirementCategories"] = [];
  const toMap = new Map(toCats.map((c) => [c.id, c]));
  const fromMap = new Map(fromCats.map((c) => [c.id, c]));

  for (const cat of fromCats) {
    const match = toMap.get(cat.id);
    if (!match) {
      result.push({
        status: "removed",
        before: { ...cat, requirements: cat.requirements.map((r) => ({ status: "removed" as const, before: r })) },
      });
    } else {
      const reqDiffs = diffById(cat.requirements, match.requirements, reqEqual);
      const catStatus = cat.name !== match.name || cat.type !== match.type ? "modified" as const : "unchanged" as const;
      result.push({
        status: reqDiffs.some((d) => d.status !== "unchanged") ? "modified" : catStatus,
        before: { ...cat, requirements: reqDiffs },
        after: { ...match, requirements: reqDiffs },
      });
    }
  }

  for (const cat of toCats) {
    if (!fromMap.has(cat.id)) {
      result.push({
        status: "added",
        after: { ...cat, requirements: cat.requirements.map((r) => ({ status: "added" as const, after: r })) },
      });
    }
  }

  return result;
}

function objectiveEqual(a: { title: string; successCriteria: string }, b: { title: string; successCriteria: string }) {
  return a.title === b.title && a.successCriteria === b.successCriteria;
}

function storyEqual(
  a: { role: string; capability: string; benefit: string; priority: string },
  b: { role: string; capability: string; benefit: string; priority: string }
) {
  return a.role === b.role && a.capability === b.capability && a.benefit === b.benefit && a.priority === b.priority;
}

function reqEqual(
  a: { title: string; description: string; priority: string },
  b: { title: string; description: string; priority: string }
) {
  return a.title === b.title && a.description === b.description && a.priority === b.priority;
}

function flowEqual(a: { name: string; flowType: string }, b: { name: string; flowType: string }) {
  return a.name === b.name && a.flowType === b.flowType;
}

export function countChanges(diff: SnapshotDiff): { added: number; modified: number; removed: number } {
  let added = 0, modified = 0, removed = 0;

  for (const m of diff.meta) {
    if (m.status === "added") added++;
    else if (m.status === "modified") modified++;
    else if (m.status === "removed") removed++;
  }
  for (const d of [...diff.objectives, ...diff.userStories, ...diff.processFlows]) {
    if (d.status === "added") added++;
    else if (d.status === "modified") modified++;
    else if (d.status === "removed") removed++;
  }
  for (const cat of diff.requirementCategories) {
    if (cat.status === "added") added++;
    else if (cat.status === "removed") removed++;
    const reqs = cat.before?.requirements ?? cat.after?.requirements ?? [];
    for (const r of reqs) {
      if (r.status === "added") added++;
      else if (r.status === "modified") modified++;
      else if (r.status === "removed") removed++;
    }
  }

  return { added, modified, removed };
}
