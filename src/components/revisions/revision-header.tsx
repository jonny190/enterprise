"use client";

import { Lock } from "lucide-react";

type VersionHeaderProps = {
  revisionNumber: number;
  title: string;
  createdAt: string;
};

export function VersionHeader({ revisionNumber, title, createdAt }: VersionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-muted px-2 py-1 text-sm font-mono">
          V{revisionNumber}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        Read-only snapshot
      </div>
    </div>
  );
}
