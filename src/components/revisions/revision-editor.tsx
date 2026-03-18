"use client";

import { VersionHeader } from "./revision-header";
import { VersionTabs } from "./revision-tabs";
import { type VersionSnapshot } from "@/lib/revisions";

type VersionViewerProps = {
  projectId: string;
  revisionNumber: number;
  title: string;
  createdAt: string;
  snapshot: VersionSnapshot;
};

export function VersionViewer({
  projectId: _projectId,
  revisionNumber,
  title,
  createdAt,
  snapshot,
}: VersionViewerProps) {
  void _projectId;
  return (
    <div>
      <VersionHeader
        revisionNumber={revisionNumber}
        title={title}
        createdAt={createdAt}
      />
      <div className="p-4">
        <VersionTabs snapshot={snapshot} />
      </div>
    </div>
  );
}
