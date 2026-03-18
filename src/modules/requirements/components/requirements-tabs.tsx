"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SortableList } from "./sortable-list";
import { EditableItem } from "./editable-item";
import { PriorityBadge } from "./priority-badge";
import {
  updateObjective,
  deleteObjective,
  addObjective,
  reorderObjectives,
  updateUserStory,
  deleteUserStory,
  addUserStory,
  reorderUserStories,
  updateProjectMeta,
  addRequirementCategory,
  deleteRequirementCategory,
  addRequirement,
  updateRequirement,
  deleteRequirement,
} from "@/modules/requirements/actions";
import { Priority, RequirementType } from "@prisma/client";

type NFRMetric = {
  id: string;
  metricName: string;
  targetValue: string;
  unit: string;
};

type Requirement = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  metrics: NFRMetric[];
};

type RequirementCategory = {
  id: string;
  name: string;
  type: RequirementType;
  requirements: Requirement[];
};

type RequirementsTabsProps = {
  projectId: string;
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  };
  objectives: { id: string; title: string; successCriteria: string }[];
  userStories: {
    id: string;
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[];
  nfrCategories: RequirementCategory[];
  constraintCategories: RequirementCategory[];
};

export function RequirementsTabs(props: RequirementsTabsProps) {
  return (
    <Tabs defaultValue="vision" className="w-full">
      <TabsList>
        <TabsTrigger value="vision">Vision</TabsTrigger>
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="stories">User Stories</TabsTrigger>
        <TabsTrigger value="nfrs">NFRs</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
      </TabsList>

      <TabsContent value="vision" className="mt-4 max-w-2xl">
        <VisionTab
          projectId={props.projectId}
          visionStatement={props.meta.visionStatement}
        />
      </TabsContent>

      <TabsContent value="objectives" className="mt-4 max-w-2xl">
        <ObjectivesTab
          projectId={props.projectId}
          objectives={props.objectives}
        />
      </TabsContent>

      <TabsContent value="stories" className="mt-4 max-w-2xl">
        <UserStoriesTab
          projectId={props.projectId}
          stories={props.userStories}
        />
      </TabsContent>

      <TabsContent value="nfrs" className="mt-4 max-w-2xl">
        <NFRTab
          projectId={props.projectId}
          categories={props.nfrCategories}
        />
      </TabsContent>

      <TabsContent value="constraints" className="mt-4 max-w-2xl">
        <ConstraintsTab
          projectId={props.projectId}
          categories={props.constraintCategories}
        />
      </TabsContent>
    </Tabs>
  );
}

function VisionTab({
  projectId,
  visionStatement,
}: {
  projectId: string;
  visionStatement: string;
}) {
  const [value, setValue] = useState(visionStatement);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await updateProjectMeta(projectId, { visionStatement: value });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Vision statement..."
      />
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

function ObjectivesTab({
  projectId,
  objectives,
}: {
  projectId: string;
  objectives: { id: string; title: string; successCriteria: string }[];
}) {
  return (
    <div className="space-y-4">
      <SortableList
        items={objectives}
        onReorder={(ids) => reorderObjectives(projectId, ids)}
        renderItem={(item) => {
          const obj = objectives.find((o) => o.id === item.id)!;
          return (
            <EditableItem
              title={obj.title}
              subtitle={obj.successCriteria}
              onSave={async (data) => {
                await updateObjective(obj.id, {
                  title: data.title,
                  successCriteria: data.successCriteria,
                });
              }}
              onDelete={async () => {
                await deleteObjective(obj.id);
              }}
              fields={[
                { name: "title", label: "Title", value: obj.title, type: "input" },
                {
                  name: "successCriteria",
                  label: "Success Criteria",
                  value: obj.successCriteria,
                  type: "textarea",
                },
              ]}
            />
          );
        }}
      />
      <Button
        variant="outline"
        onClick={() =>
          addObjective(projectId, { title: "New Objective", successCriteria: "" })
        }
      >
        Add Objective
      </Button>
    </div>
  );
}

function UserStoriesTab({
  projectId,
  stories,
}: {
  projectId: string;
  stories: {
    id: string;
    role: string;
    capability: string;
    benefit: string;
    priority: Priority;
  }[];
}) {
  return (
    <div className="space-y-4">
      <SortableList
        items={stories}
        onReorder={(ids) => reorderUserStories(projectId, ids)}
        renderItem={(item) => {
          const story = stories.find((s) => s.id === item.id)!;
          return (
            <EditableItem
              title={`As a ${story.role}, I want ${story.capability}`}
              subtitle={story.benefit ? `So that ${story.benefit}` : undefined}
              onSave={async (data) => {
                await updateUserStory(story.id, {
                  role: data.role,
                  capability: data.capability,
                  benefit: data.benefit,
                  priority: data.priority as Priority,
                });
              }}
              onDelete={async () => {
                await deleteUserStory(story.id);
              }}
              fields={[
                { name: "role", label: "Role", value: story.role, type: "input" },
                {
                  name: "capability",
                  label: "Capability",
                  value: story.capability,
                  type: "input",
                },
                {
                  name: "benefit",
                  label: "Benefit",
                  value: story.benefit,
                  type: "input",
                },
              ]}
            />
          );
        }}
      />
      <Button
        variant="outline"
        onClick={() =>
          addUserStory(projectId, {
            role: "user",
            capability: "new capability",
            benefit: "",
            priority: "should",
          })
        }
      >
        Add User Story
      </Button>
    </div>
  );
}

function CategorySection({
  projectId,
  category,
  onCategoryDeleted,
}: {
  projectId: string;
  category: RequirementCategory;
  onCategoryDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [addingReq, setAddingReq] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("should");
  const [loading, setLoading] = useState(false);

  async function handleAddRequirement() {
    if (!newTitle.trim()) return;
    setLoading(true);
    await addRequirement(category.id, {
      title: newTitle,
      description: newDesc,
      priority: newPriority,
    });
    setNewTitle("");
    setNewDesc("");
    setNewPriority("should");
    setAddingReq(false);
    setLoading(false);
  }

  async function handleDeleteCategory() {
    if (!confirm(`Delete category "${category.name}" and all its requirements?`)) return;
    setLoading(true);
    await deleteRequirementCategory(category.id);
    onCategoryDeleted(category.id);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2">
        <button
          className="flex items-center gap-2 text-sm font-medium text-left flex-1"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="text-gray-500">{open ? "v" : ">"}</span>
          {category.name}
          <span className="ml-1 text-xs text-gray-500">
            ({category.requirements.length})
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 text-xs"
          onClick={handleDeleteCategory}
          disabled={loading}
        >
          Delete
        </Button>
      </div>
      {open && (
        <div className="p-3 space-y-2">
          {category.requirements.map((req) => (
            <EditableItem
              key={req.id}
              title={
                <span className="flex items-center gap-2">
                  <PriorityBadge priority={req.priority} />
                  {req.title}
                </span>
              }
              subtitle={req.description || undefined}
              onSave={async (data) => {
                await updateRequirement(req.id, {
                  title: data.title,
                  description: data.description,
                  priority: data.priority as Priority,
                });
              }}
              onDelete={async () => {
                await deleteRequirement(req.id);
              }}
              fields={[
                { name: "title", label: "Title", value: req.title, type: "input" },
                {
                  name: "description",
                  label: "Description",
                  value: req.description,
                  type: "textarea",
                },
                {
                  name: "priority",
                  label: "Priority (must/should/could/wont)",
                  value: req.priority,
                  type: "input",
                },
              ]}
            />
          ))}
          {addingReq ? (
            <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
              <Input
                placeholder="Requirement title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
              <select
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
              >
                <option value="must">Must</option>
                <option value="should">Should</option>
                <option value="could">Could</option>
                <option value="wont">Won&apos;t</option>
              </select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddRequirement} disabled={loading}>
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingReq(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400"
              onClick={() => setAddingReq(true)}
            >
              + Add requirement
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function NFRTab({
  projectId,
  categories,
}: {
  projectId: string;
  categories: RequirementCategory[];
}) {
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const visible = categories.filter((c) => !deletedIds.includes(c.id));

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setLoading(true);
    await addRequirementCategory(projectId, {
      type: "non_functional",
      name: newCatName,
    });
    setNewCatName("");
    setAddingCategory(false);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Non-functional requirements with measurable targets. Add categories and requirements below.
      </p>
      {visible.map((cat) => (
        <CategorySection
          key={cat.id}
          projectId={projectId}
          category={cat}
          onCategoryDeleted={(id) => setDeletedIds((prev) => [...prev, id])}
        />
      ))}
      {addingCategory ? (
        <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
          <Input
            placeholder="Category name (e.g. Performance)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCategory} disabled={loading}>
              Add Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingCategory(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAddingCategory(true)}>
          Add Category
        </Button>
      )}
    </div>
  );
}

function ConstraintsTab({
  projectId,
  categories,
}: {
  projectId: string;
  categories: RequirementCategory[];
}) {
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<RequirementType>("constraint");
  const [loading, setLoading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const visible = categories.filter((c) => !deletedIds.includes(c.id));

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setLoading(true);
    await addRequirementCategory(projectId, {
      type: newCatType,
      name: newCatName,
    });
    setNewCatName("");
    setAddingCategory(false);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Constraints, assumptions, and dependencies that affect the project.
      </p>
      {visible.map((cat) => (
        <CategorySection
          key={cat.id}
          projectId={projectId}
          category={cat}
          onCategoryDeleted={(id) => setDeletedIds((prev) => [...prev, id])}
        />
      ))}
      {addingCategory ? (
        <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
          <Input
            placeholder="Category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <select
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as RequirementType)}
          >
            <option value="constraint">Constraint</option>
            <option value="assumption">Assumption</option>
            <option value="dependency">Dependency</option>
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCategory} disabled={loading}>
              Add Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingCategory(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAddingCategory(true)}>
          Add Category
        </Button>
      )}
    </div>
  );
}
