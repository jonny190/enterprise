"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveVisionStatement } from "@/modules/wizard/actions";

export function StepVision({
  projectId,
  initialValue,
  onComplete,
}: {
  projectId: string;
  initialValue: string;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await saveVisionStatement(projectId, fd.get("vision") as string);
    setLoading(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Vision Statement</h3>
        <p className="text-sm text-gray-400">
          Write a single clear statement that describes what this project will
          achieve and why it matters.
        </p>
      </div>
      <Textarea
        name="vision"
        rows={4}
        required
        defaultValue={initialValue}
        placeholder="To create a..."
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
