"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VersionSnapshot } from "@/lib/revisions";

type VersionTabsProps = {
  snapshot: VersionSnapshot;
};

export function VersionTabs({ snapshot }: VersionTabsProps) {
  return (
    <Tabs defaultValue="meta" className="w-full">
      <TabsList>
        <TabsTrigger value="meta">Meta</TabsTrigger>
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="stories">User Stories</TabsTrigger>
        <TabsTrigger value="nfrs">NFRs</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
        <TabsTrigger value="flows">Process Flows</TabsTrigger>
      </TabsList>

      <TabsContent value="meta" className="mt-4 max-w-2xl">
        <MetaView meta={snapshot.meta} />
      </TabsContent>

      <TabsContent value="objectives" className="mt-4 max-w-2xl">
        <ObjectivesView objectives={snapshot.objectives} />
      </TabsContent>

      <TabsContent value="stories" className="mt-4 max-w-2xl">
        <UserStoriesView stories={snapshot.userStories} />
      </TabsContent>

      <TabsContent value="nfrs" className="mt-4 max-w-2xl">
        <CategoriesView
          categories={snapshot.requirementCategories.filter(c => c.type === "non_functional")}
          description="Non-functional requirements with measurable targets."
        />
      </TabsContent>

      <TabsContent value="constraints" className="mt-4 max-w-2xl">
        <CategoriesView
          categories={snapshot.requirementCategories.filter(
            c => c.type === "constraint" || c.type === "assumption" || c.type === "dependency"
          )}
          description="Constraints, assumptions, and dependencies that affect the project."
        />
      </TabsContent>

      <TabsContent value="flows" className="mt-4 max-w-2xl">
        <ProcessFlowsView flows={snapshot.processFlows} />
      </TabsContent>
    </Tabs>
  );
}

// Meta fields display
const META_FIELDS: { key: string; label: string }[] = [
  { key: "visionStatement", label: "Vision Statement" },
  { key: "businessContext", label: "Business Context" },
  { key: "targetUsers", label: "Target Users" },
  { key: "technicalConstraints", label: "Technical Constraints" },
  { key: "timeline", label: "Timeline" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "glossary", label: "Glossary" },
];

function MetaView({ meta }: { meta: VersionSnapshot["meta"] }) {
  return (
    <div className="space-y-4">
      {META_FIELDS.map((field) => {
        const value = meta[field.key as keyof typeof meta] as string;
        return (
          <div key={field.key} className="space-y-1">
            <label className="text-sm font-medium text-gray-300">{field.label}</label>
            <div className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm whitespace-pre-wrap min-h-8">
              {value || <span className="text-gray-500 italic">Not set</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ObjectivesView({ objectives }: { objectives: VersionSnapshot["objectives"] }) {
  if (objectives.length === 0) {
    return <p className="text-sm text-muted-foreground">No objectives in this version.</p>;
  }
  return (
    <div className="space-y-3">
      {objectives.map((obj) => (
        <div key={obj.id} className="rounded-md border border-gray-700 bg-gray-900 p-3">
          <p className="text-sm font-medium">{obj.title}</p>
          {obj.successCriteria && (
            <p className="text-xs text-gray-400 mt-1">{obj.successCriteria}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function UserStoriesView({ stories }: { stories: VersionSnapshot["userStories"] }) {
  if (stories.length === 0) {
    return <p className="text-sm text-muted-foreground">No user stories in this version.</p>;
  }
  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <div key={story.id} className="rounded-md border border-gray-700 bg-gray-900 p-3">
          <p className="text-sm font-medium">
            As a {story.role}, I want {story.capability}
          </p>
          {story.benefit && (
            <p className="text-xs text-gray-400 mt-1">So that {story.benefit}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Priority: {story.priority}</p>
        </div>
      ))}
    </div>
  );
}

function CategoriesView({
  categories,
  description,
}: {
  categories: VersionSnapshot["requirementCategories"];
  description: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{description}</p>
      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">No items in this version.</p>
      )}
      {categories.map((cat) => (
        <CategorySection key={cat.id} category={cat} />
      ))}
    </div>
  );
}

function CategorySection({
  category,
}: {
  category: VersionSnapshot["requirementCategories"][0];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <button
        className="flex items-center gap-2 w-full bg-gray-900 px-4 py-2 text-sm font-medium text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-gray-500">{open ? "v" : ">"}</span>
        {category.name}
        <span className="ml-1 text-xs text-gray-500">({category.requirements.length})</span>
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {category.requirements.map((req) => (
            <div key={req.id} className="rounded-md border border-gray-700 bg-gray-800/50 p-3">
              <p className="text-sm font-medium">{req.title}</p>
              {req.description && (
                <p className="text-xs text-gray-400 mt-1">{req.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Priority: {req.priority}</p>
              {req.metrics.length > 0 && (
                <div className="mt-2 space-y-1">
                  {req.metrics.map((m) => (
                    <p key={m.id} className="text-xs text-gray-500">
                      {m.metricName}: {m.targetValue} {m.unit}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {category.requirements.length === 0 && (
            <p className="text-sm text-muted-foreground">No requirements.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessFlowsView({ flows }: { flows: VersionSnapshot["processFlows"] }) {
  if (flows.length === 0) {
    return <p className="text-sm text-muted-foreground">No process flows in this version.</p>;
  }
  return (
    <div className="space-y-3">
      {flows.map((flow) => (
        <div key={flow.id} className="rounded-md border border-gray-700 bg-gray-900 p-3">
          <p className="text-sm font-medium">{flow.name}</p>
          <p className="text-xs text-gray-500 mt-1">Type: {flow.flowType}</p>
        </div>
      ))}
    </div>
  );
}
