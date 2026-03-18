"use client";

import { type DragEvent } from "react";
import { Square, Diamond, Circle, Layers } from "lucide-react";

const nodeTypes = [
  { type: "process", label: "Process", icon: Square },
  { type: "decision", label: "Decision", icon: Diamond },
  { type: "start_end", label: "Start/End", icon: Circle },
  { type: "subprocess", label: "Subprocess", icon: Layers },
];

export function FlowToolbar() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
      {nodeTypes.map(({ type, label, icon: Icon }) => (
        <div
          key={type}
          className="flex cursor-grab items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-card-foreground hover:bg-accent active:cursor-grabbing"
          draggable
          onDragStart={(e) => onDragStart(e, type)}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
      ))}
    </div>
  );
}
