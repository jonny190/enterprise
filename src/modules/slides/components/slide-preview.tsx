"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Slide = {
  title: string;
  bullets: string[];
  notes?: string;
};

type SlidePreviewProps = {
  slides: Slide[];
  projectName: string;
  onClose: () => void;
};

export function SlidePreview({ slides, projectName, onClose }: SlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load reveal.js CSS from CDN
    const link1 = document.createElement("link");
    link1.rel = "stylesheet";
    link1.href = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css";
    document.head.appendChild(link1);

    const link2 = document.createElement("link");
    link2.rel = "stylesheet";
    link2.href = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css";
    document.head.appendChild(link2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deck: any = null;

    async function init() {
      const Reveal = (await import("reveal.js")).default;

      if (!containerRef.current) return;

      deck = new Reveal(containerRef.current, {
        hash: false,
        embedded: true,
        showNotes: false,
        width: 960,
        height: 600,
        margin: 0.1,
        keyboard: true,
      });

      await deck.initialize();
    }

    init();

    return () => {
      if (deck) {
        try { deck.destroy(); } catch { /* ignore */ }
      }
      link1.remove();
      link2.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-sm text-gray-400">{projectName} - Slide Deck</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div
          ref={containerRef}
          className="reveal"
          style={{ width: "960px", height: "600px" }}
        >
          <div className="slides">
            {slides.map((slide, i) => (
              <section key={i}>
                <h2>{slide.title}</h2>
                <ul>
                  {slide.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
