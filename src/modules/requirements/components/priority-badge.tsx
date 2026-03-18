import { cn } from "@/lib/utils";
import { Priority } from "@prisma/client";

const PRIORITY_COLORS: Record<Priority, string> = {
  must: "bg-red-900/50 text-red-300 border-red-800",
  should: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  could: "bg-blue-900/50 text-blue-300 border-blue-800",
  wont: "bg-gray-800 text-gray-400 border-gray-700",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "rounded border px-2 py-0.5 text-xs font-medium",
        PRIORITY_COLORS[priority]
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
