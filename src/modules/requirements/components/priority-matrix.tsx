"use client";

import { useState } from "react";

type Story = {
  id: string;
  role: string;
  capability: string;
  benefit: string;
  priority: string;
};

type Requirement = {
  id: string;
  title: string;
  description: string;
  priority: string;
  categoryName: string;
};

type PriorityMatrixProps = {
  userStories: Story[];
  requirements: Requirement[];
};

const PRIORITIES = [
  { key: "must", label: "Must Have", color: "border-red-500/40 bg-red-950/20", badge: "bg-red-500/20 text-red-400", description: "Non-negotiable requirements" },
  { key: "should", label: "Should Have", color: "border-amber-500/40 bg-amber-950/20", badge: "bg-amber-500/20 text-amber-400", description: "Important but not critical" },
  { key: "could", label: "Could Have", color: "border-blue-500/40 bg-blue-950/20", badge: "bg-blue-500/20 text-blue-400", description: "Nice to have if time allows" },
  { key: "wont", label: "Won't Have", color: "border-gray-700 bg-gray-900/50", badge: "bg-gray-700 text-gray-400", description: "Explicitly out of scope" },
] as const;

type ViewMode = "stories" | "requirements" | "all";

export function PriorityMatrix({ userStories, requirements }: PriorityMatrixProps) {
  const [view, setView] = useState<ViewMode>("all");

  const showStories = view === "stories" || view === "all";
  const showReqs = view === "requirements" || view === "all";

  const storiesByPriority = groupBy(userStories, (s) => s.priority);
  const reqsByPriority = groupBy(requirements, (r) => r.priority);

  const totalItems = userStories.length + requirements.length;
  const mustCount = (storiesByPriority["must"]?.length ?? 0) + (reqsByPriority["must"]?.length ?? 0);
  const shouldCount = (storiesByPriority["should"]?.length ?? 0) + (reqsByPriority["should"]?.length ?? 0);
  const couldCount = (storiesByPriority["could"]?.length ?? 0) + (reqsByPriority["could"]?.length ?? 0);
  const wontCount = (storiesByPriority["wont"]?.length ?? 0) + (reqsByPriority["wont"]?.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-800 overflow-hidden">
            {(["all", "stories", "requirements"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-3 py-1.5 text-xs font-medium ${
                  view === mode
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {mode === "all" ? "All" : mode === "stories" ? "User Stories" : "Requirements"}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {totalItems} total items
        </div>
      </div>

      {totalItems > 0 && (
        <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-gray-800">
          {mustCount > 0 && (
            <div
              className="bg-red-500 rounded-full"
              style={{ width: `${(mustCount / totalItems) * 100}%` }}
              title={`Must: ${mustCount}`}
            />
          )}
          {shouldCount > 0 && (
            <div
              className="bg-amber-500 rounded-full"
              style={{ width: `${(shouldCount / totalItems) * 100}%` }}
              title={`Should: ${shouldCount}`}
            />
          )}
          {couldCount > 0 && (
            <div
              className="bg-blue-500 rounded-full"
              style={{ width: `${(couldCount / totalItems) * 100}%` }}
              title={`Could: ${couldCount}`}
            />
          )}
          {wontCount > 0 && (
            <div
              className="bg-gray-600 rounded-full"
              style={{ width: `${(wontCount / totalItems) * 100}%` }}
              title={`Won't: ${wontCount}`}
            />
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {PRIORITIES.map((p) => {
          const stories = storiesByPriority[p.key] ?? [];
          const reqs = reqsByPriority[p.key] ?? [];
          const count = (showStories ? stories.length : 0) + (showReqs ? reqs.length : 0);

          return (
            <div key={p.key} className={`rounded-lg border p-4 ${p.color}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.badge}`}>
                    {p.label}
                  </span>
                  <span className="text-xs text-gray-500">{count} items</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">{p.description}</p>

              <div className="space-y-2">
                {showStories && stories.map((story) => (
                  <div key={story.id} className="rounded-md border border-gray-700/50 bg-gray-900/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400 uppercase">
                        Story
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm">
                          As a <span className="font-medium">{story.role}</span>, I want{" "}
                          <span className="font-medium">{story.capability}</span>
                        </p>
                        {story.benefit && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            So that {story.benefit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {showReqs && reqs.map((req) => (
                  <div key={req.id} className="rounded-md border border-gray-700/50 bg-gray-900/60 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400 uppercase">
                        Req
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{req.title}</p>
                        {req.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-0.5">{req.categoryName}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {count === 0 && (
                  <p className="text-xs text-gray-600 italic">No items</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}
