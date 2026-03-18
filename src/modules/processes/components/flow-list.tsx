"use client";

import { useState } from "react";
import { type FlowType } from "@prisma/client";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  createProcessFlow,
  deleteProcessFlow,
} from "@/modules/processes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Flow = {
  id: string;
  name: string;
  flowType: FlowType;
};

type FlowListProps = {
  projectId: string;
  flows: Flow[];
  selectedFlowId: string | null;
  onSelectFlow: (id: string) => void;
};

export function FlowList({
  projectId,
  flows,
  selectedFlowId,
  onSelectFlow,
}: FlowListProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<FlowType>("as_is");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const flow = await createProcessFlow(projectId, newName.trim(), newType);
    setNewName("");
    setAdding(false);
    onSelectFlow(flow.id);
  };

  const handleDelete = async (id: string) => {
    await deleteProcessFlow(id, projectId);
  };

  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-medium">Process Flows</h3>
        <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {adding && (
        <div className="space-y-2 border-b p-3">
          <Input
            placeholder="Flow name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as FlowType)}
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="as_is">As-Is</option>
            <option value="to_be">To-Be</option>
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className={`flex cursor-pointer items-center justify-between border-b px-3 py-2 hover:bg-gray-50 ${
              selectedFlowId === flow.id ? "bg-gray-100" : ""
            }`}
            onClick={() => onSelectFlow(flow.id)}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-300" />
              <div>
                <div className="text-sm font-medium">{flow.name}</div>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {flow.flowType === "as_is" ? "As-Is" : "To-Be"}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(flow.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </div>
        ))}

        {flows.length === 0 && !adding && (
          <div className="p-4 text-center text-sm text-gray-400">
            No process flows yet. Click + to add one.
          </div>
        )}
      </div>
    </div>
  );
}
