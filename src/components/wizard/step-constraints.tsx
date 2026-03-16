"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveConstraints } from "@/actions/wizard";
import { Priority } from "@prisma/client";

type ConstraintType = "constraint" | "assumption" | "dependency";
type ConstraintItem = {
  type: ConstraintType;
  name: string;
  requirements: { title: string; description: string; priority: Priority }[];
};

export function StepConstraints({
  projectId,
  initialItems,
  onComplete,
}: {
  projectId: string;
  initialItems: ConstraintItem[];
  onComplete: () => void;
}) {
  const [items, setItems] = useState<ConstraintItem[]>(
    initialItems.length > 0
      ? initialItems
      : [
          {
            type: "constraint",
            name: "Constraints",
            requirements: [{ title: "", description: "", priority: "should" }],
          },
          {
            type: "assumption",
            name: "Assumptions",
            requirements: [{ title: "", description: "", priority: "should" }],
          },
          {
            type: "dependency",
            name: "Dependencies",
            requirements: [{ title: "", description: "", priority: "should" }],
          },
        ]
  );
  const [loading, setLoading] = useState(false);

  function addReq(itemIndex: number) {
    const updated = [...items];
    updated[itemIndex].requirements.push({
      title: "",
      description: "",
      priority: "should",
    });
    setItems(updated);
  }

  function updateReq(
    itemIndex: number,
    reqIndex: number,
    field: string,
    value: string
  ) {
    const updated = [...items];
    (updated[itemIndex].requirements[reqIndex] as Record<string, unknown>)[field] = value;
    setItems(updated);
  }

  function removeReq(itemIndex: number, reqIndex: number) {
    const updated = [...items];
    updated[itemIndex].requirements = updated[itemIndex].requirements.filter(
      (_, i) => i !== reqIndex
    );
    setItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await saveConstraints(projectId, items);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          Constraints, Assumptions & Dependencies
        </h3>
        <p className="text-sm text-gray-400">
          Document anything that limits, assumes, or depends on external factors.
        </p>
      </div>
      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="rounded-lg border border-gray-800 p-4">
          <h4 className="mb-3 text-sm font-medium capitalize">{item.type}s</h4>
          {item.requirements.map((req, reqIndex) => (
            <div key={reqIndex} className="mb-3 ml-4 space-y-2 border-l border-gray-800 pl-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={`${item.type} title`}
                  value={req.title}
                  onChange={(e) =>
                    updateReq(itemIndex, reqIndex, "title", e.target.value)
                  }
                  className="flex-1"
                />
                {item.requirements.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReq(itemIndex, reqIndex)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Description"
                value={req.description}
                onChange={(e) =>
                  updateReq(itemIndex, reqIndex, "description", e.target.value)
                }
                rows={2}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addReq(itemIndex)}
            className="ml-4"
          >
            + Add {item.type}
          </Button>
        </div>
      ))}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
