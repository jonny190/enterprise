"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type OrgItem = {
  id: string;
  name: string;
  slug: string;
};

export function OrgRail({ orgs, currentSlug }: { orgs: OrgItem[]; currentSlug?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-14 flex-col items-center gap-2 border-r bg-gray-950 py-3">
      <Link
        href="/dashboard"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white",
          !currentSlug && "bg-blue-600",
          currentSlug && "bg-gray-800 hover:bg-gray-700"
        )}
      >
        E
      </Link>
      <div className="my-1 h-px w-8 bg-gray-800" />
      {orgs.map((org) => (
        <Link
          key={org.id}
          href={`/org/${org.slug}/projects`}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium text-gray-300",
            currentSlug === org.slug
              ? "bg-blue-600 text-white"
              : "bg-gray-800 hover:bg-gray-700"
          )}
          title={org.name}
        >
          {org.name.substring(0, 2).toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
