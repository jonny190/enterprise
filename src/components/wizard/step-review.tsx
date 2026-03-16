"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { finalizeWizard } from "@/actions/wizard";
import { useRouter } from "next/navigation";

type ReviewData = {
  meta: {
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
  };
  objectives: { title: string; successCriteria: string }[];
  userStories: { role: string; capability: string; benefit: string; priority: string }[];
  nfrCount: number;
  constraintCount: number;
};

export function StepReview({
  projectId,
  data,
}: {
  projectId: string;
  data: ReviewData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleFinalize() {
    setLoading(true);
    await finalizeWizard(projectId);
    router.push(`/project/${projectId}/requirements`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Review & Finalize</h3>
        <p className="text-sm text-gray-400">
          Review your requirements before finalizing. You can always edit them
          later in freeform mode.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="mb-2 text-sm font-medium">Vision</h4>
        <p className="text-sm text-gray-300">
          {data.meta.visionStatement || "Not set"}
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="mb-2 text-sm font-medium">
          Objectives ({data.objectives.length})
        </h4>
        <ul className="list-inside list-disc text-sm text-gray-300">
          {data.objectives.map((obj, i) => (
            <li key={i}>{obj.title}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="mb-2 text-sm font-medium">
          User Stories ({data.userStories.length})
        </h4>
        <ul className="list-inside list-disc text-sm text-gray-300">
          {data.userStories.map((s, i) => (
            <li key={i}>
              As a {s.role}, I want {s.capability}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-gray-800 p-4">
        <h4 className="text-sm font-medium">
          {data.nfrCount} NFR categories, {data.constraintCount}{" "}
          constraints/assumptions/dependencies
        </h4>
      </div>
      <Button onClick={handleFinalize} disabled={loading}>
        {loading ? "Finalizing..." : "Finalize & Enter Freeform Mode"}
      </Button>
    </div>
  );
}
