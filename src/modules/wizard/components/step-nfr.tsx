"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveNFRs } from "@/modules/wizard/actions";
import { Priority } from "@prisma/client";

type Metric = { metricName: string; targetValue: string; unit: string };
type NFRReq = {
  title: string;
  description: string;
  priority: Priority;
  metrics: Metric[];
};
type NFRCategory = { name: string; requirements: NFRReq[] };

const SUGGESTED_CATEGORIES = [
  "Performance",
  "Security",
  "Scalability",
  "Availability",
  "Usability",
  "Maintainability",
];

export function StepNFR({
  projectId,
  initialCategories,
  onComplete,
}: {
  projectId: string;
  initialCategories: NFRCategory[];
  onComplete: () => void;
}) {
  const [categories, setCategories] = useState<NFRCategory[]>(
    initialCategories.length > 0
      ? initialCategories
      : [
          {
            name: "Performance",
            requirements: [
              {
                title: "",
                description: "",
                priority: "should",
                metrics: [{ metricName: "", targetValue: "", unit: "" }],
              },
            ],
          },
        ]
  );
  const [loading, setLoading] = useState(false);

  function addCategory() {
    const unused = SUGGESTED_CATEGORIES.find(
      (s) => !categories.some((c) => c.name === s)
    );
    setCategories([
      ...categories,
      {
        name: unused || "",
        requirements: [
          {
            title: "",
            description: "",
            priority: "should",
            metrics: [{ metricName: "", targetValue: "", unit: "" }],
          },
        ],
      },
    ]);
  }

  function removeCategory(index: number) {
    setCategories(categories.filter((_, i) => i !== index));
  }

  function updateCategoryName(index: number, name: string) {
    const updated = [...categories];
    updated[index] = { ...updated[index], name };
    setCategories(updated);
  }

  function addRequirement(catIndex: number) {
    const updated = [...categories];
    updated[catIndex].requirements.push({
      title: "",
      description: "",
      priority: "should",
      metrics: [{ metricName: "", targetValue: "", unit: "" }],
    });
    setCategories(updated);
  }

  function updateRequirement(
    catIndex: number,
    reqIndex: number,
    field: string,
    value: string
  ) {
    const updated = [...categories];
    (updated[catIndex].requirements[reqIndex] as Record<string, unknown>)[field] = value;
    setCategories(updated);
  }

  function addMetric(catIndex: number, reqIndex: number) {
    const updated = [...categories];
    updated[catIndex].requirements[reqIndex].metrics.push({
      metricName: "",
      targetValue: "",
      unit: "",
    });
    setCategories(updated);
  }

  function updateMetric(
    catIndex: number,
    reqIndex: number,
    metIndex: number,
    field: keyof Metric,
    value: string
  ) {
    const updated = [...categories];
    updated[catIndex].requirements[reqIndex].metrics[metIndex][field] = value;
    setCategories(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const valid = categories.filter(
      (c) => c.name.trim() && c.requirements.some((r) => r.title.trim())
    );
    await saveNFRs(projectId, valid);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Non-Functional Requirements</h3>
        <p className="text-sm text-gray-400">
          Define measurable quality attributes. Add metrics with target values.
        </p>
      </div>
      {categories.map((cat, catIndex) => (
        <div key={catIndex} className="rounded-lg border border-gray-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Input
              value={cat.name}
              onChange={(e) => updateCategoryName(catIndex, e.target.value)}
              placeholder="Category name"
              className="w-48"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCategory(catIndex)}
            >
              Remove Category
            </Button>
          </div>
          {cat.requirements.map((req, reqIndex) => (
            <div key={reqIndex} className="ml-4 mb-4 space-y-2 border-l border-gray-800 pl-4">
              <Input
                placeholder="Requirement title"
                value={req.title}
                onChange={(e) =>
                  updateRequirement(catIndex, reqIndex, "title", e.target.value)
                }
              />
              <Textarea
                placeholder="Description"
                value={req.description}
                onChange={(e) =>
                  updateRequirement(
                    catIndex,
                    reqIndex,
                    "description",
                    e.target.value
                  )
                }
                rows={2}
              />
              <div className="text-xs font-medium text-gray-500">Metrics:</div>
              {req.metrics.map((met, metIndex) => (
                <div key={metIndex} className="flex gap-2">
                  <Input
                    placeholder="Metric"
                    value={met.metricName}
                    onChange={(e) =>
                      updateMetric(
                        catIndex,
                        reqIndex,
                        metIndex,
                        "metricName",
                        e.target.value
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Target"
                    value={met.targetValue}
                    onChange={(e) =>
                      updateMetric(
                        catIndex,
                        reqIndex,
                        metIndex,
                        "targetValue",
                        e.target.value
                      )
                    }
                    className="w-24"
                  />
                  <Input
                    placeholder="Unit"
                    value={met.unit}
                    onChange={(e) =>
                      updateMetric(
                        catIndex,
                        reqIndex,
                        metIndex,
                        "unit",
                        e.target.value
                      )
                    }
                    className="w-24"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addMetric(catIndex, reqIndex)}
              >
                + Metric
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addRequirement(catIndex)}
            className="ml-4"
          >
            + Requirement
          </Button>
        </div>
      ))}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={addCategory}>
          Add Category
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
