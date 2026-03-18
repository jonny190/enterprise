"use client";

import { VersionHeader } from "./revision-header";
import { VersionTabs } from "./revision-tabs";
import { type VersionSnapshot } from "@/modules/versions/lib";

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
        gitCommitSha={snapshot.gitCommitSha}
        gitCommitMessage={snapshot.gitCommitMessage}
        gitCommitUrl={snapshot.gitCommitUrl}
      />
      <div className="p-4">
        <VersionTabs snapshot={snapshot} />
      </div>
    </div>
  );
}
