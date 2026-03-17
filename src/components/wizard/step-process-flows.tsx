"use client";

import { useState } from "react";
import { type FlowType } from "@prisma/client";
import { saveProcessFlows } from "@/actions/wizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

type FlowItem = {
  name: string;
  flowType: FlowType;
  diagramData: { nodes: unknown[]; edges: unknown[] };
};

type Props = {
  projectId: string;
  initialFlows: FlowItem[];
  onComplete: () => void;
};

export function StepProcessFlows({
  projectId,
  initialFlows,
  onComplete,
}: Props) {
  const [flows, setFlows] = useState<FlowItem[]>(
    initialFlows.length > 0 ? initialFlows : []
  );
  const [saving, setSaving] = useState(false);

  const addFlow = () => {
    if (flows.length >= 5) return;
    setFlows([
      ...flows,
      { name: "", flowType: "as_is", diagramData: { nodes: [], edges: [] } },
    ]);
  };

  const removeFlow = (index: number) => {
    setFlows(flows.filter((_, i) => i !== index));
  };

  const updateFlow = (index: number, field: string, value: string) => {
    setFlows(
      flows.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    const valid = flows.filter((f) => f.name.trim());
    await saveProcessFlows(projectId, valid);
    setSaving(false);
    onComplete();
  };

  const canAdd = flows.length < 5;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Process Flows</h2>
        <p className="text-sm text-gray-500">
          Optionally describe key business processes. You can add detailed
          flowcharts later from the Processes tab. Skip this step if not needed.
        </p>
      </div>

      {flows.map((flow, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Flow {index + 1}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeFlow(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Flow name (e.g. Order Processing)"
            value={flow.name}
            onChange={(e) => updateFlow(index, "name", e.target.value)}
          />
          <select
            value={flow.flowType}
            onChange={(e) =>
              updateFlow(index, "flowType", e.target.value)
            }
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="as_is">As-Is (Current Process)</option>
            <option value="to_be">To-Be (Future Process)</option>
          </select>
        </div>
      ))}

      <div className="flex gap-3">
        {canAdd && (
          <Button variant="outline" onClick={addFlow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Process Flow
          </Button>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : flows.length > 0 ? "Save & Continue" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
