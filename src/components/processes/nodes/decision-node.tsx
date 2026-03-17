"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

type DecisionNodeData = { label: string; onLabelChange?: (label: string) => void };

export function DecisionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DecisionNodeData;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (nodeData.onLabelChange) nodeData.onLabelChange(label);
  };

  return (
    <div
      className={`rotate-45 border-2 bg-white min-w-30 min-h-20 flex items-center justify-center shadow-sm ${
        selected ? "border-blue-500" : "border-amber-400"
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="bg-gray-400!" />
      <div className="-rotate-45 flex items-center justify-center px-4 py-2">
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBlur()}
            className="w-full bg-transparent text-center text-xs outline-none"
          />
        ) : (
          <span className="text-xs">{label}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="yes" className="bg-green-500!" />
      <Handle type="source" position={Position.Bottom} id="no" className="bg-red-500!" />
    </div>
  );
}
