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

  const w = 160;
  const h = 80;

  return (
    <div
      className="relative"
      style={{ width: w, height: h }}
      onDoubleClick={() => setEditing(true)}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0"
      >
        <polygon
          points={`${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`}
          className={selected ? "fill-card stroke-primary" : "fill-card stroke-amber-500"}
          strokeWidth="2"
        />
      </svg>
      <Handle type="target" position={Position.Top} className="bg-muted-foreground!" />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        {editing ? (
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBlur()}
            className="w-full bg-transparent text-center text-xs outline-none text-card-foreground"
          />
        ) : (
          <span className="text-xs text-center leading-tight text-card-foreground">{label}</span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="bg-green-500!"
        style={{ top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="bg-red-500!"
        style={{ left: "50%" }}
      />
    </div>
  );
}
