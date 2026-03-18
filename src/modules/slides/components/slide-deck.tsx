"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Presentation } from "lucide-react";
import { SlidePreview } from "./slide-preview";
import { toast } from "sonner";

type Slide = {
  title: string;
  bullets: string[];
  notes?: string;
  layout?: "title" | "bullets" | "two-column" | "highlight";
  vertical?: boolean;
};

export function SlideDeck({ projectId }: { projectId: string }) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [projectName, setProjectName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
      setLogoUrl(data.logoUrl);
      toast.success("Slide deck generated and saved to Outputs");
    } catch {
      setError("Failed to generate slide deck. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function exportHTML() {
    if (!slides) return;
    const html = buildRevealHTML(slides, projectName, logoUrl);
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
          The AI will create 8-14 slides with varied layouts and transitions.
          Decks are automatically saved to the Outputs tab.
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
        logoUrl={logoUrl}
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
            className={`rounded-lg border bg-gray-900 p-4 aspect-[16/10]
              flex flex-col justify-center cursor-pointer hover:border-gray-600
              ${slide.vertical ? "border-blue-900/50 ml-4" : "border-gray-800"}
              ${slide.layout === "title" ? "text-center" : ""}
              ${slide.layout === "highlight" ? "text-center" : ""}`}
            onClick={() => setPresenting(true)}
          >
            <div className="flex items-center gap-2 mb-1">
              {slide.layout && slide.layout !== "bullets" && (
                <span className="text-[9px] text-gray-600 uppercase">{slide.layout}</span>
              )}
              {slide.vertical && (
                <span className="text-[9px] text-blue-500 uppercase">vertical</span>
              )}
            </div>
            <h3 className="text-sm font-semibold mb-2">{slide.title}</h3>
            <ul className="space-y-1">
              {slide.bullets.slice(0, 4).map((b, j) => (
                <li key={j} className="text-xs text-gray-400 flex gap-1.5">
                  <span className="text-gray-600 shrink-0">-</span>
                  <span>{b}</span>
                </li>
              ))}
              {slide.bullets.length > 4 && (
                <li className="text-[10px] text-gray-600">+{slide.bullets.length - 4} more</li>
              )}
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

function buildRevealHTML(slides: Slide[], projectName: string, logoUrl: string | null): string {
  // Group slides: horizontal slides contain vertical sub-slides
  const groups: Slide[][] = [];
  for (const slide of slides) {
    if (slide.vertical && groups.length > 0) {
      groups[groups.length - 1].push(slide);
    } else {
      groups.push([slide]);
    }
  }

  const slidesHTML = groups
    .map((group) => {
      if (group.length === 1) {
        return `<section${group[0].layout === "title" ? ' data-transition="zoom"' : ' data-transition="slide"'}>\n${renderSlide(group[0], logoUrl)}\n</section>`;
      }
      const inner = group
        .map((s, i) => `  <section${i === 0 ? ' data-transition="slide"' : ' data-transition="fade"'}>\n${renderSlide(s, logoUrl)}\n  </section>`)
        .join("\n");
      return `<section>\n${inner}\n</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(projectName)} - Slide Deck</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css">
  <style>
    .reveal ul { text-align: left; }
    .reveal li { margin-bottom: 0.5em; font-size: 0.8em; }
    .reveal .slide-logo { position: absolute; top: 20px; right: 20px; height: 40px; opacity: 0.8; }
    .reveal .highlight-text { font-size: 2em; font-weight: bold; color: #60a5fa; }
    .reveal .highlight-sub { font-size: 0.9em; color: #9ca3af; margin-top: 0.5em; }
    .reveal .two-col { display: flex; gap: 2em; text-align: left; }
    .reveal .two-col > div { flex: 1; }
    .reveal .title-slide h1 { font-size: 2.5em; }
    .reveal .title-slide p { font-size: 1.1em; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHTML}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      showNotes: false,
      transition: 'slide',
      transitionSpeed: 'default'
    });
  </script>
</body>
</html>`;
}

function renderSlide(slide: Slide, logoUrl: string | null): string {
  const logo = logoUrl ? `<img src="${esc(logoUrl)}" class="slide-logo" alt="Logo">` : "";
  const notes = slide.notes ? `<aside class="notes">${esc(slide.notes)}</aside>` : "";

  switch (slide.layout) {
    case "title":
      return `${logo}
    <div class="title-slide">
      <h1>${esc(slide.title)}</h1>
      ${slide.bullets[0] ? `<p>${esc(slide.bullets[0])}</p>` : ""}
    </div>
    ${notes}`;

    case "highlight":
      return `${logo}
    <h3>${esc(slide.title)}</h3>
    <div class="highlight-text">${esc(slide.bullets[0] ?? "")}</div>
    ${slide.bullets[1] ? `<div class="highlight-sub">${esc(slide.bullets[1])}</div>` : ""}
    ${notes}`;

    case "two-column": {
      const mid = Math.ceil(slide.bullets.length / 2);
      const left = slide.bullets.slice(0, mid);
      const right = slide.bullets.slice(mid);
      return `${logo}
    <h2>${esc(slide.title)}</h2>
    <div class="two-col">
      <div><ul>${left.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
      <div><ul>${right.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
    </div>
    ${notes}`;
    }

    default:
      return `${logo}
    <h2>${esc(slide.title)}</h2>
    <ul>
      ${slide.bullets.map((b) => `<li>${esc(b)}</li>`).join("\n      ")}
    </ul>
    ${notes}`;
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
