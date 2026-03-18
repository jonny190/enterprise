"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type GenerateFlowButtonProps = {
  projectId: string;
  onGenerated: (diagramData: { nodes: unknown[]; edges: unknown[] }) => void;
};

export function GenerateFlowButton({
  projectId,
  onGenerated,
}: GenerateFlowButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/generate-flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.nodes && data.edges) {
        onGenerated(data);
        toast.success("Flow generated successfully");
      } else {
        toast.error(data.error || "Failed to generate flow");
      }
    } catch (error) {
      console.error("Generate flow error:", error);
      toast.error("Failed to generate flow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      {loading ? "Generating..." : "AI Generate"}
    </Button>
  );
}
