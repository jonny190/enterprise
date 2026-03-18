"use client";

import { useCallback, useRef, useMemo, useEffect, type DragEvent } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ProcessNode } from "./nodes/process-node";
import { DecisionNode } from "./nodes/decision-node";
import { StartEndNode } from "./nodes/start-end-node";
import { SubprocessNode } from "./nodes/subprocess-node";
import { FlowToolbar } from "./flow-toolbar";
import { updateDiagramData } from "@/modules/processes/actions";

type FlowCanvasProps = {
  flowId: string;
  projectId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
};

function FlowCanvas({
  flowId,
  projectId,
  initialNodes,
  initialEdges,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // Keep refs in sync for debounced save
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const nodeTypes = useMemo(
    () => ({
      process: ProcessNode,
      decision: DecisionNode,
      start_end: StartEndNode,
      subprocess: SubprocessNode,
    }),
    []
  );

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateDiagramData(flowId, projectId, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });
    }, 1000);
  }, [flowId, projectId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      debouncedSave();
    },
    [setEdges, debouncedSave]
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      debouncedSave();
    },
    [onNodesChange, debouncedSave]
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      debouncedSave();
    },
    [onEdgesChange, debouncedSave]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: type === "start_end" ? "Start" : "New Step" },
      };

      setNodes((nds) => [...nds, newNode]);
      debouncedSave();
    },
    [setNodes, screenToFlowPosition, debouncedSave]
  );

  const onNodeLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
        );
        return updated;
      });
      debouncedSave();
    },
    [setNodes, debouncedSave]
  );

  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onLabelChange: (label: string) => onNodeLabelChange(n.id, label),
        },
      })),
    [nodes, onNodeLabelChange]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <FlowToolbar />
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          snapToGrid
          snapGrid={[15, 15]}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={15} />
        </ReactFlow>
      </div>
    </div>
  );
}

export function FlowCanvasWithProvider(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
