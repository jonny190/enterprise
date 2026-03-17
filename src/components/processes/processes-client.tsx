"use client";

import { useState } from "react";
import { type FlowType } from "@prisma/client";
import { type Node, type Edge } from "@xyflow/react";
import { FlowList } from "./flow-list";
import { FlowCanvasWithProvider } from "./flow-canvas";

type ProcessFlow = {
  id: string;
  name: string;
  description: string;
  flowType: FlowType;
  diagramData: { nodes: Node[]; edges: Edge[] };
};

type ProcessesClientProps = {
  projectId: string;
  flows: ProcessFlow[];
};

export function ProcessesClient({ projectId, flows }: ProcessesClientProps) {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(
    flows[0]?.id ?? null
  );

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="w-64 shrink-0">
        <FlowList
          projectId={projectId}
          flows={flows}
          selectedFlowId={selectedFlowId}
          onSelectFlow={setSelectedFlowId}
        />
      </div>
      <div className="flex-1">
        {selectedFlow ? (
          <FlowCanvasWithProvider
            key={selectedFlow.id}
            flowId={selectedFlow.id}
            projectId={projectId}
            initialNodes={selectedFlow.diagramData.nodes ?? []}
            initialEdges={selectedFlow.diagramData.edges ?? []}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select or create a process flow to get started.
          </div>
        )}
      </div>
    </div>
  );
}
