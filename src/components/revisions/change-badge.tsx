"use client";

import { type ChangeType } from "@prisma/client";
import { X } from "lucide-react";

type ChangeBadgeProps = {
  changeType: ChangeType;
  onUndo?: () => void;
};

const styles: Record<ChangeType, { label: string; className: string }> = {
  added: { label: "Added", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  modified: { label: "Modified", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  removed: { label: "Removed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function ChangeBadge({ changeType, onUndo }: ChangeBadgeProps) {
  const style = styles[changeType];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
      {onUndo && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
          className="hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
