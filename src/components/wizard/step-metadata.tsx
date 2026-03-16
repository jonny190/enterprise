"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProjectMeta } from "@/actions/wizard";

type MetaData = {
  businessContext: string;
  targetUsers: string;
  stakeholders: string;
  timeline: string;
  glossary: string;
  technicalConstraints: string;
};

export function StepMetadata({
  projectId,
  initialData,
  onComplete,
}: {
  projectId: string;
  initialData: MetaData;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    await saveProjectMeta(projectId, {
      businessContext: fd.get("businessContext") as string,
      targetUsers: fd.get("targetUsers") as string,
      stakeholders: fd.get("stakeholders") as string,
      timeline: fd.get("timeline") as string,
      glossary: fd.get("glossary") as string,
      technicalConstraints: fd.get("technicalConstraints") as string,
    });

    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Project Metadata</h3>
        <p className="text-sm text-gray-400">
          Provide context about the project, its users, and constraints.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium">Business Context</label>
        <Textarea
          name="businessContext"
          rows={3}
          defaultValue={initialData.businessContext}
          placeholder="Why does this project exist? What problem does it solve?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Target Users</label>
        <Textarea
          name="targetUsers"
          rows={2}
          defaultValue={initialData.targetUsers}
          placeholder="Who will use the final product?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Stakeholders</label>
        <Textarea
          name="stakeholders"
          rows={2}
          defaultValue={initialData.stakeholders}
          placeholder="Key people and roles involved"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Timeline</label>
        <Input
          name="timeline"
          defaultValue={initialData.timeline}
          placeholder="Expected milestones or deadlines"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Technical Constraints
        </label>
        <Textarea
          name="technicalConstraints"
          rows={2}
          defaultValue={initialData.technicalConstraints}
          placeholder="Existing systems, tech stack requirements, integrations"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Glossary</label>
        <Textarea
          name="glossary"
          rows={2}
          defaultValue={initialData.glossary}
          placeholder="Domain-specific terms and definitions"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
