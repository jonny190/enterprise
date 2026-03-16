"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ProjectItem = {
  id: string;
  name: string;
  status: string;
};

export function ProjectSidebar({
  orgSlug,
  orgName,
  projects,
  currentProjectId,
}: {
  orgSlug: string;
  orgName: string;
  projects: ProjectItem[];
  currentProjectId?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-56 flex-col border-r bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{orgName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="mb-1 px-2 text-xs font-medium uppercase text-gray-500">
          Projects
        </div>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}/wizard`}
            className={cn(
              "mb-0.5 block rounded-md px-2 py-1.5 text-sm",
              currentProjectId === project.id
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            )}
          >
            {project.name}
          </Link>
        ))}
        {projects.length === 0 && (
          <p className="px-2 text-xs text-gray-600">No projects yet</p>
        )}
      </div>
      <div className="border-t border-gray-800 px-2 py-2">
        <Link
          href={`/org/${orgSlug}/members`}
          className={cn(
            "mb-0.5 block rounded-md px-2 py-1.5 text-sm",
            pathname.includes("/members")
              ? "bg-gray-800 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          )}
        >
          Members
        </Link>
        <Link
          href={`/org/${orgSlug}/settings`}
          className={cn(
            "mb-0.5 block rounded-md px-2 py-1.5 text-sm",
            pathname.includes("/settings") && pathname.includes("/org/")
              ? "bg-gray-800 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          )}
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
