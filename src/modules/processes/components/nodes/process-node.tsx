"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useState, useRef, useEffect } from "react";

type ProcessNodeData = { label: string; onLabelChange?: (label: string) => void };

export function ProcessNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProcessNodeData;
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
      className={`rounded-lg border-2 bg-card text-card-foreground px-4 py-2.5 min-w-[140px] max-w-[220px] text-center shadow-sm ${
        selected ? "border-primary" : "border-border"
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="bg-muted-foreground!" />
      {editing ? (
        <input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className="w-full bg-transparent text-center text-sm outline-none text-card-foreground"
        />
      ) : (
        <span className="text-sm leading-snug">{label}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="bg-muted-foreground!" />
    </div>
  );
}
