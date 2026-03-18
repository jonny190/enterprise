"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputTypePicker } from "./output-type-picker";
import { RevisionSelector } from "./revision-selector";
import { ExportButtons } from "./export-buttons";
import { saveGeneratedOutput } from "@/modules/generation/actions";
import { OutputType } from "@prisma/client";

type Props = {
  projectId: string;
  revisions?: { revisionNumber: number; title: string; status: string }[];
};

export function GenerationPreview({ projectId, revisions }: Props) {
  const [outputType, setOutputType] = useState<string | null>(null);
  const [revisionNumber, setRevisionNumber] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    if (!outputType) return;
    setIsGenerating(true);
    setError("");
    setContent("");
    setEditedContent("");
    setIsEditing(false);
    setSaved(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, outputType, revisionNumber }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setContent(accumulated);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Generation failed. Please try again.");
        setContent("");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!outputType || !content) return;
    const result = await saveGeneratedOutput(projectId, {
      outputType: outputType as OutputType,
      content,
      editedContent: isEditing ? editedContent : undefined,
    });
    if (result.success) setSaved(true);
  }

  const displayContent = isEditing ? editedContent : content;

  return (
    <div className="space-y-6">
      <RevisionSelector
        revisions={revisions ?? []}
        selected={revisionNumber}
        onSelect={setRevisionNumber}
      />
      <OutputTypePicker selected={outputType} onSelect={setOutputType} />

      {outputType && (
        <div className="flex gap-3">
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
          {isGenerating && (
            <Button
              variant="outline"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={handleGenerate}
          >
            Retry
          </Button>
        </div>
      )}

      {content && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!isEditing) setEditedContent(content);
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? "Preview" : "Edit"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saved}>
              {saved ? "Saved" : "Save to History"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(displayContent)}
            >
              Copy
            </Button>
            <ExportButtons
              content={displayContent}
              projectName={`output-${outputType}`}
            />
          </div>

          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          ) : (
            <div className="max-h-[600px] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-200">
                {content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
