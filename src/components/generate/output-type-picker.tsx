"use client";

import { cn } from "@/lib/utils";

const OUTPUT_TYPES = [
  {
    id: "ai_prompt",
    label: "AI Coding Prompt",
    description: "Structured prompt for AI coding tools",
  },
  {
    id: "requirements_doc",
    label: "Requirements Document",
    description: "Formal requirements document for sign-off",
  },
  {
    id: "project_brief",
    label: "Project Brief",
    description: "Concise overview for stakeholders",
  },
  {
    id: "technical_spec",
    label: "Technical Spec",
    description: "Architecture-oriented specification",
  },
];

export function OutputTypePicker({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (type: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OUTPUT_TYPES.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id)}
          className={cn(
            "rounded-lg border p-4 text-left",
            selected === type.id
              ? "border-blue-500 bg-blue-950/30"
              : "border-gray-800 hover:border-gray-700"
          )}
        >
          <div className="text-sm font-medium">{type.label}</div>
          <div className="mt-1 text-xs text-gray-400">{type.description}</div>
        </button>
      ))}
    </div>
  );
}
