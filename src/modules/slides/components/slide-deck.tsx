"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Presentation } from "lucide-react";
import { SlidePreview } from "./slide-preview";

type Slide = {
  title: string;
  bullets: string[];
  notes?: string;
};

export function SlideDeck({ projectId }: { projectId: string }) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [presenting, setPresenting] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Failed to generate slides");
      const data = await res.json();
      setSlides(data.slides);
      setProjectName(data.projectName);
    } catch {
      setError("Failed to generate slide deck. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function exportHTML() {
    if (!slides) return;
    const html = buildRevealHTML(slides, projectName);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-deck.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!slides) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Generate a presentation-ready slide deck from your project requirements.
          The AI will create 8-12 slides covering vision, objectives, user stories,
          and key requirements.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={generate} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? "Generating slides..." : "Generate Slide Deck"}
        </Button>
      </div>
    );
  }

  if (presenting) {
    return (
      <SlidePreview
        slides={slides}
        projectName={projectName}
        onClose={() => setPresenting(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setPresenting(true)}>
          <Presentation className="mr-2 h-4 w-4" />
          Present
        </Button>
        <Button variant="outline" size="sm" onClick={exportHTML}>
          <Download className="mr-2 h-4 w-4" />
          Export HTML
        </Button>
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          {loading ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-800 bg-gray-900 p-4 aspect-[16/10]
              flex flex-col justify-center cursor-pointer hover:border-gray-600"
            onClick={() => setPresenting(true)}
          >
            <h3 className="text-sm font-semibold mb-2 text-center">{slide.title}</h3>
            <ul className="space-y-1">
              {slide.bullets.map((b, j) => (
                <li key={j} className="text-xs text-gray-400 flex gap-1.5">
                  <span className="text-gray-600 shrink-0">-</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-gray-600 mt-auto pt-2 text-right">
              {i + 1}/{slides.length}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildRevealHTML(slides: Slide[], projectName: string): string {
  const slidesHTML = slides
    .map(
      (slide) => `
        <section>
          <h2>${escapeHTML(slide.title)}</h2>
          <ul>
            ${slide.bullets.map((b) => `<li>${escapeHTML(b)}</li>`).join("\n            ")}
          </ul>
          ${slide.notes ? `<aside class="notes">${escapeHTML(slide.notes)}</aside>` : ""}
        </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(projectName)} - Slide Deck</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css">
  <style>
    .reveal ul { text-align: left; }
    .reveal li { margin-bottom: 0.5em; font-size: 0.8em; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHTML}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script>Reveal.initialize({ hash: true, showNotes: false });</script>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
