"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveObjectives } from "@/actions/wizard";

type ObjectiveItem = {
  title: string;
  successCriteria: string;
};

export function StepObjectives({
  projectId,
  initialObjectives,
  onComplete,
}: {
  projectId: string;
  initialObjectives: ObjectiveItem[];
  onComplete: () => void;
}) {
  const [objectives, setObjectives] = useState<ObjectiveItem[]>(
    initialObjectives.length > 0
      ? initialObjectives
      : [{ title: "", successCriteria: "" }]
  );
  const [loading, setLoading] = useState(false);

  const canAdd = objectives.length < 5;

  function addObjective() {
    if (canAdd) {
      setObjectives([...objectives, { title: "", successCriteria: "" }]);
    }
  }

  function removeObjective(index: number) {
    if (objectives.length > 1) {
      setObjectives(objectives.filter((_, i) => i !== index));
    }
  }

  function updateObjective(
    index: number,
    field: keyof ObjectiveItem,
    value: string
  ) {
    const updated = [...objectives];
    updated[index] = { ...updated[index], [field]: value };
    setObjectives(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = objectives.filter((o) => o.title.trim());
    if (valid.length === 0) return;

    setLoading(true);
    await saveObjectives(projectId, valid);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Key Objectives (up to 5)</h3>
        <p className="text-sm text-gray-400">
          Define measurable outcomes with success criteria. Minimum 1, maximum 5.
        </p>
      </div>
      {objectives.map((obj, index) => (
        <div key={index} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Objective {index + 1}</span>
            {objectives.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeObjective(index)}
              >
                Remove
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Objective title"
              value={obj.title}
              onChange={(e) => updateObjective(index, "title", e.target.value)}
              required
            />
            <Textarea
              placeholder="How will success be measured?"
              value={obj.successCriteria}
              onChange={(e) =>
                updateObjective(index, "successCriteria", e.target.value)
              }
              rows={2}
            />
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        {canAdd && (
          <Button type="button" variant="outline" onClick={addObjective}>
            Add Objective
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
