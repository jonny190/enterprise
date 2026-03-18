"use client";

type RevisionOption = {
  revisionNumber: number;
  title: string;
  status: string;
};

type RevisionSelectorProps = {
  revisions: RevisionOption[];
  selected: number | null;
  onSelect: (revisionNumber: number | null) => void;
};

export function RevisionSelector({ revisions, selected, onSelect }: RevisionSelectorProps) {
  if (revisions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Generate from version:</label>
      <select
        value={selected ?? "baseline"}
        onChange={(e) => onSelect(e.target.value === "baseline" ? null : Number(e.target.value))}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
      >
        <option value="baseline">Current (latest)</option>
        {revisions
          .filter((r) => r.status === "finalized")
          .map((r) => (
            <option key={r.revisionNumber} value={r.revisionNumber}>
              V{r.revisionNumber}: {r.title}
            </option>
          ))}
      </select>
    </div>
  );
}
