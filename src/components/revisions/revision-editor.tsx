"use client";

import { type ChangeType } from "@prisma/client";
import { RevisionHeader } from "./revision-header";
import { RevisionTabs } from "./revision-tabs";
import { type ResolvedProjectState } from "@/lib/revisions";

type RevisionChange = {
  id: string;
  changeType: ChangeType;
  targetType: string;
  targetId: string | null;
  data: Record<string, unknown>;
};

type RevisionEditorProps = {
  revisionId: string;
  projectId: string;
  revisionNumber: number;
  title: string;
  status: string;
  resolvedState: ResolvedProjectState;
  changes: RevisionChange[];
};

export function RevisionEditor({
  revisionId,
  projectId,
  revisionNumber,
  title,
  status,
  resolvedState,
  changes,
}: RevisionEditorProps) {
  const isDraft = status === "draft";

  return (
    <div>
      <RevisionHeader
        revisionId={revisionId}
        projectId={projectId}
        title={title}
        revisionNumber={revisionNumber}
        status={status}
        changeCount={changes.length}
      />
      <div className="p-4">
        <RevisionTabs
          revisionId={revisionId}
          projectId={projectId}
          revisionNumber={revisionNumber}
          resolvedState={resolvedState}
          changes={changes}
          isDraft={isDraft}
        />
      </div>
    </div>
  );
}
