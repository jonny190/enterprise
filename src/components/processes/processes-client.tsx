"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type FlowType } from "@prisma/client";
import { type Node, type Edge } from "@xyflow/react";
import { FlowList } from "./flow-list";
import { FlowCanvasWithProvider } from "./flow-canvas";
import { GenerateFlowButton } from "./generate-flow-dialog";
import { updateDiagramData } from "@/actions/processes";

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
  const router = useRouter();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(
    flows[0]?.id ?? null
  );
  const [canvasKey, setCanvasKey] = useState(0);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);

  const handleFlowGenerated = async (diagramData: {
    nodes: unknown[];
    edges: unknown[];
  }) => {
    if (!selectedFlowId) return;
    await updateDiagramData(selectedFlowId, projectId, diagramData);
    setCanvasKey((k) => k + 1);
    router.refresh();
  };

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
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-2">
              <span className="text-sm font-medium">{selectedFlow.name}</span>
              <GenerateFlowButton
                projectId={projectId}
                onGenerated={handleFlowGenerated}
              />
            </div>
            <div className="flex-1">
              <FlowCanvasWithProvider
                key={`${selectedFlow.id}-${canvasKey}`}
                flowId={selectedFlow.id}
                projectId={projectId}
                initialNodes={selectedFlow.diagramData.nodes ?? []}
                initialEdges={selectedFlow.diagramData.edges ?? []}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select or create a process flow to get started.
          </div>
        )}
      </div>
    </div>
  );
}
