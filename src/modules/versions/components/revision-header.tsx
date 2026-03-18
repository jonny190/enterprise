"use client";

import { Lock, GitCommit } from "lucide-react";

type VersionHeaderProps = {
  revisionNumber: number;
  title: string;
  createdAt: string;
  gitCommitSha?: string;
  gitCommitMessage?: string;
  gitCommitUrl?: string;
};

export function VersionHeader({
  revisionNumber,
  title,
  createdAt,
  gitCommitSha,
  gitCommitMessage,
  gitCommitUrl,
}: VersionHeaderProps) {
  return (
    <div className="border-b p-4 space-y-2">
      <div className="flex items-center justify-between">
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
      {gitCommitSha && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitCommit className="h-3.5 w-3.5" />
          {gitCommitUrl ? (
            <a
              href={gitCommitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-blue-400"
            >
              {gitCommitSha.slice(0, 7)}
            </a>
          ) : (
            <span className="font-mono">{gitCommitSha.slice(0, 7)}</span>
          )}
          {gitCommitMessage && (
            <span className="truncate max-w-md">{gitCommitMessage}</span>
          )}
        </div>
      )}
    </div>
  );
}
