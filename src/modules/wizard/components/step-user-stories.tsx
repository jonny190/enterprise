"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveUserStories } from "@/modules/wizard/actions";
import { Priority } from "@prisma/client";
import { Loader2, Check, Pencil, Sparkles } from "lucide-react";
import type { GeneratedStory } from "@/modules/wizard/lib/generate-stories";

type StoryItem = {
  role: string;
  capability: string;
  benefit: string;
  priority: Priority;
};

type StoryCardState = "pending" | "accepted" | "editing";

export function StepUserStories({
  projectId,
  initialStories,
  onComplete,
}: {
  projectId: string;
  initialStories: StoryItem[];
  onComplete: () => void;
}) {
  const [stories, setStories] = useState<StoryItem[]>(
    initialStories.length > 0 ? initialStories : []
  );
  const [cardStates, setCardStates] = useState<StoryCardState[]>([]);
  const [editBuffers, setEditBuffers] = useState<StoryItem[]>([]);
  const [mode, setMode] = useState<"manual" | "review">(
    initialStories.length > 0 ? "manual" : "manual"
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [saving, setSaving] = useState(false);

  const allAccepted =
    mode === "review" &&
    cardStates.length > 0 &&
    cardStates.every((s) => s === "accepted");

  async function handleGenerate() {
    setGenerating(true);
    setGenError("");

    try {
      const response = await fetch("/api/generate-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      const generated: GeneratedStory[] = data.stories;

      const mapped: StoryItem[] = generated.map((s) => ({
        role: s.role,
        capability: s.capability,
        benefit: s.benefit,
        priority: s.priority as Priority,
      }));

      setStories(mapped);
      setCardStates(mapped.map(() => "pending"));
      setEditBuffers(mapped.map((s) => ({ ...s })));
      setMode("review");
    } catch (error) {
      setGenError(
        error instanceof Error ? error.message : "Generation failed"
      );
    } finally {
      setGenerating(false);
    }
  }

  function acceptStory(index: number) {
    const updated = [...cardStates];
    updated[index] = "accepted";
    setCardStates(updated);
  }

  function startEditing(index: number) {
    const updated = [...cardStates];
    updated[index] = "editing";
    setCardStates(updated);
    const buffers = [...editBuffers];
    buffers[index] = { ...stories[index] };
    setEditBuffers(buffers);
  }

  function updateEditBuffer(
    index: number,
    field: keyof StoryItem,
    value: string
  ) {
    const buffers = [...editBuffers];
    buffers[index] = { ...buffers[index], [field]: value };
    setEditBuffers(buffers);
  }

  function saveEdit(index: number) {
    const updated = [...stories];
    updated[index] = { ...editBuffers[index] };
    setStories(updated);
    const states = [...cardStates];
    states[index] = "accepted";
    setCardStates(states);
  }

  function cancelEdit(index: number) {
    const states = [...cardStates];
    states[index] = "pending";
    setCardStates(states);
  }

  async function handleSubmitReview() {
    setSaving(true);
    await saveUserStories(projectId, stories);
    setSaving(false);
    onComplete();
  }

  async function handleSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    const valid = stories.filter((s) => s.role.trim() && s.capability.trim());
    if (valid.length === 0) return;
    setSaving(true);
    await saveUserStories(projectId, valid);
    setSaving(false);
    onComplete();
  }

  function addStory() {
    if (stories.length < 10) {
      setStories([
        ...stories,
        { role: "", capability: "", benefit: "", priority: "should" },
      ]);
    }
  }

  function removeStory(index: number) {
    if (stories.length > 1) {
      setStories(stories.filter((_, i) => i !== index));
    }
  }

  function updateStory(index: number, field: keyof StoryItem, value: string) {
    const updated = [...stories];
    updated[index] = { ...updated[index], [field]: value };
    setStories(updated);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">User Stories</h3>
        <p className="text-sm text-gray-400">
          Generate 10 user stories from your project context, then review each
          one.
        </p>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          variant={mode === "review" ? "outline" : "default"}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {stories.length > 0 ? "Regenerate User Stories" : "Generate User Stories"}
            </>
          )}
        </Button>
        {stories.length > 0 && mode !== "review" && (
          <span className="text-xs text-gray-500">
            or edit existing stories below
          </span>
        )}
      </div>

      {genError && (
        <div className="rounded-md bg-red-900/20 border border-red-800/50 p-3 text-sm text-red-400">
          {genError}
        </div>
      )}

      {/* Skeleton loading state */}
      {generating && (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-gray-800 bg-gray-800/30"
            />
          ))}
        </div>
      )}

      {/* Review mode: Accept/Edit cards */}
      {mode === "review" && !generating && stories.length > 0 && (
        <div className="space-y-3">
          {stories.map((story, index) => {
            const state = cardStates[index];
            const buffer = editBuffers[index];

            return (
              <div
                key={index}
                className={`rounded-lg border p-4 transition-colors ${
                  state === "accepted"
                    ? "border-green-800/50 bg-green-900/10"
                    : "border-gray-800"
                }`}
              >
                {state === "editing" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-sm text-gray-400">As a</span>
                      <Input
                        value={buffer.role}
                        onChange={(e) =>
                          updateEditBuffer(index, "role", e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-sm text-gray-400">I want</span>
                      <Input
                        value={buffer.capability}
                        onChange={(e) =>
                          updateEditBuffer(index, "capability", e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-sm text-gray-400">So that</span>
                      <Input
                        value={buffer.benefit}
                        onChange={(e) =>
                          updateEditBuffer(index, "benefit", e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <select
                        value={buffer.priority}
                        onChange={(e) =>
                          updateEditBuffer(index, "priority", e.target.value)
                        }
                        className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                      >
                        <option value="must">Must have</option>
                        <option value="should">Should have</option>
                        <option value="could">Could have</option>
                        <option value="wont">Won&apos;t have</option>
                      </select>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelEdit(index)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveEdit(index)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="text-gray-400">As a </span>
                        <span className="font-medium">{story.role}</span>
                        <span className="text-gray-400">, I want </span>
                        <span className="font-medium">{story.capability}</span>
                        <span className="text-gray-400">, so that </span>
                        <span className="font-medium">{story.benefit}</span>
                      </p>
                      <span
                        className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${
                          story.priority === "must"
                            ? "bg-red-900/30 text-red-400"
                            : story.priority === "should"
                              ? "bg-yellow-900/30 text-yellow-400"
                              : story.priority === "could"
                                ? "bg-blue-900/30 text-blue-400"
                                : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {story.priority === "wont"
                          ? "Won't have"
                          : `${story.priority.charAt(0).toUpperCase()}${story.priority.slice(1)} have`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {state === "accepted" ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Check className="h-3.5 w-3.5" />
                          Accepted
                        </span>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(index)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => acceptStory(index)}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Accept
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            onClick={handleSubmitReview}
            disabled={!allAccepted || saving}
          >
            {saving
              ? "Saving..."
              : allAccepted
                ? "Continue"
                : `Accept all stories to continue (${cardStates.filter((s) => s === "accepted").length}/10)`}
          </Button>
        </div>
      )}

      {/* Manual mode: existing editable form */}
      {mode === "manual" && !generating && stories.length > 0 && (
        <form onSubmit={handleSubmitManual} className="space-y-4">
          {stories.map((story, index) => (
            <div key={index} className="rounded-lg border border-gray-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Story {index + 1}</span>
                {stories.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStory(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">As a</span>
                  <Input
                    placeholder="role"
                    value={story.role}
                    onChange={(e) => updateStory(index, "role", e.target.value)}
                    required
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">I want</span>
                  <Input
                    placeholder="capability"
                    value={story.capability}
                    onChange={(e) =>
                      updateStory(index, "capability", e.target.value)
                    }
                    required
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">So that</span>
                  <Input
                    placeholder="benefit"
                    value={story.benefit}
                    onChange={(e) => updateStory(index, "benefit", e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div>
                  <select
                    value={story.priority}
                    onChange={(e) =>
                      updateStory(index, "priority", e.target.value)
                    }
                    className="h-9 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
                  >
                    <option value="must">Must have</option>
                    <option value="should">Should have</option>
                    <option value="could">Could have</option>
                    <option value="wont">Won&apos;t have</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            {stories.length < 10 && (
              <Button type="button" variant="outline" onClick={addStory}>
                Add Story
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Continue"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
