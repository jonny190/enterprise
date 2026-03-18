"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { updateProjectMeta } from "@/modules/requirements/actions";

type Meta = {
  businessContext: string;
  targetUsers: string;
  technicalConstraints: string;
  timeline: string;
  stakeholders: string;
  glossary: string;
} | null;

export function MetaEditor({
  projectId,
  meta,
}: {
  projectId: string;
  meta: Meta;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await updateProjectMeta(projectId, {
      businessContext: fd.get("businessContext") as string,
      targetUsers: fd.get("targetUsers") as string,
      technicalConstraints: fd.get("technicalConstraints") as string,
      timeline: fd.get("timeline") as string,
      stakeholders: fd.get("stakeholders") as string,
      glossary: fd.get("glossary") as string,
    });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium">Business Context</label>
        <Textarea
          name="businessContext"
          rows={3}
          defaultValue={meta?.businessContext || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Target Users</label>
        <Textarea
          name="targetUsers"
          rows={2}
          defaultValue={meta?.targetUsers || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">
          Technical Constraints
        </label>
        <Textarea
          name="technicalConstraints"
          rows={2}
          defaultValue={meta?.technicalConstraints || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Timeline</label>
        <Input name="timeline" defaultValue={meta?.timeline || ""} />
      </div>
      <div>
        <label className="block text-sm font-medium">Stakeholders</label>
        <Textarea
          name="stakeholders"
          rows={2}
          defaultValue={meta?.stakeholders || ""}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Glossary</label>
        <Textarea
          name="glossary"
          rows={3}
          defaultValue={meta?.glossary || ""}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
