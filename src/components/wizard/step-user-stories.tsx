"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveUserStories } from "@/actions/wizard";
import { Priority } from "@prisma/client";

type StoryItem = {
  role: string;
  capability: string;
  benefit: string;
  priority: Priority;
};

export function StepUserStories({
  projectId,
  initialStories,
  onComplete,
}: {
  projectId: string;
  initialStories: StoryItem[];
  onComplete: () => void;
}) {
  const [stories, setStories] = useState<StoryItem[]>(
    initialStories.length > 0
      ? initialStories
      : [{ role: "", capability: "", benefit: "", priority: "should" }]
  );
  const [loading, setLoading] = useState(false);

  const canAdd = stories.length < 10;

  function addStory() {
    if (canAdd) {
      setStories([
        ...stories,
        { role: "", capability: "", benefit: "", priority: "should" },
      ]);
    }
  }

  function removeStory(index: number) {
    if (stories.length > 1) {
      setStories(stories.filter((_, i) => i !== index));
    }
  }

  function updateStory(index: number, field: keyof StoryItem, value: string) {
    const updated = [...stories];
    updated[index] = { ...updated[index], [field]: value };
    setStories(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = stories.filter((s) => s.role.trim() && s.capability.trim());
    if (valid.length === 0) return;

    setLoading(true);
    await saveUserStories(projectId, valid);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">User Stories (up to 10)</h3>
        <p className="text-sm text-gray-400">
          As a [role], I want [capability], so that [benefit]. Minimum 1.
        </p>
      </div>
      {stories.map((story, index) => (
        <div key={index} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Story {index + 1}</span>
            {stories.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeStory(index)}
              >
                Remove
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">As a</span>
              <Input
                placeholder="role"
                value={story.role}
                onChange={(e) => updateStory(index, "role", e.target.value)}
                required
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">I want</span>
              <Input
                placeholder="capability"
                value={story.capability}
                onChange={(e) =>
                  updateStory(index, "capability", e.target.value)
                }
                required
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">So that</span>
              <Input
                placeholder="benefit"
                value={story.benefit}
                onChange={(e) => updateStory(index, "benefit", e.target.value)}
                className="flex-1"
              />
            </div>
            <div>
              <select
                value={story.priority}
                onChange={(e) => updateStory(index, "priority", e.target.value)}
                className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
              >
                <option value="must">Must have</option>
                <option value="should">Should have</option>
                <option value="could">Could have</option>
                <option value="wont">Won&apos;t have</option>
              </select>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        {canAdd && (
          <Button type="button" variant="outline" onClick={addStory}>
            Add Story
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
