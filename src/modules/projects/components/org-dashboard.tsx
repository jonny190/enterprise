"use client";

import Link from "next/link";
import { FolderOpen, GitBranch, Target, Users, FileText } from "lucide-react";

type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  status: string;
  gitRepo: string;
  updatedAt: string;
  _count: {
    objectives: number;
    userStories: number;
    requirementCategories: number;
    revisions: number;
    generatedOutputs: number;
  };
};

type OrgDashboardProps = {
  projects: ProjectSummary[];
};

export function OrgDashboard({ projects }: OrgDashboardProps) {
  const active = projects.filter((p) => p.status === "active" || p.status === "draft");
  const archived = projects.filter((p) => p.status === "archived");
  const totalObjectives = projects.reduce((s, p) => s + p._count.objectives, 0);
  const totalStories = projects.reduce((s, p) => s + p._count.userStories, 0);
  const totalOutputs = projects.reduce((s, p) => s + p._count.generatedOutputs, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active Projects" value={active.length} icon={FolderOpen} />
        <StatCard label="Objectives" value={totalObjectives} icon={Target} />
        <StatCard label="User Stories" value={totalStories} icon={Users} />
        <StatCard label="Generated Outputs" value={totalOutputs} icon={FileText} />
      </div>

      {active.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400 uppercase tracking-wide">
            Active ({active.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400 uppercase tracking-wide">
            Archived ({archived.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <p className="text-sm text-gray-400">
          No projects yet. Create one to get started.
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const { _count } = project;
  const completeness = getCompleteness(_count);
  const lastUpdated = formatRelativeDate(project.updatedAt);

  return (
    <Link
      href={`/project/${project.id}/wizard`}
      className="rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 block"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium truncate">{project.name}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${
            project.status === "archived"
              ? "bg-gray-800 text-gray-500"
              : "bg-blue-900/30 text-blue-400"
          }`}
        >
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="mt-1.5 text-sm text-gray-400 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Completeness</span>
          <span>{completeness}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800">
          <div
            className={`h-1.5 rounded-full transition-all ${
              completeness >= 75
                ? "bg-green-500"
                : completeness >= 40
                  ? "bg-amber-500"
                  : "bg-gray-600"
            }`}
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span>{_count.objectives} obj</span>
        <span>{_count.userStories} stories</span>
        <span>{_count.requirementCategories} cats</span>
        {_count.revisions > 0 && (
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            V{_count.revisions}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-600">Updated {lastUpdated}</p>
    </Link>
  );
}

function getCompleteness(counts: ProjectSummary["_count"]): number {
  // Simple heuristic: check if key sections have content
  const sections = [
    counts.objectives > 0,
    counts.userStories > 0,
    counts.requirementCategories > 0,
    counts.generatedOutputs > 0,
  ];
  const filled = sections.filter(Boolean).length;
  return Math.round((filled / sections.length) * 100);
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
