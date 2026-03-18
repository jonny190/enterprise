"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Wizard", href: "wizard" },
  { label: "Requirements", href: "requirements" },
  { label: "Meta", href: "meta" },
  { label: "Processes", href: "processes" },
  { label: "Versions", href: "revisions" },
  { label: "Generate", href: "generate" },
  { label: "Outputs", href: "outputs" },
  { label: "Settings", href: "settings" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-gray-800 px-6">
      {tabs.map((tab) => {
        const href = `/project/${projectId}/${tab.href}`;
        const isActive = pathname === href;

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium",
              isActive
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
