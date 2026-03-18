"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Slide = {
  title: string;
  bullets: string[];
  notes?: string;
  layout?: "title" | "bullets" | "two-column" | "highlight";
  vertical?: boolean;
};

type SlidePreviewProps = {
  slides: Slide[];
  projectName: string;
  logoUrl?: string | null;
  onClose: () => void;
};

export function SlidePreview({ slides, projectName, logoUrl, onClose }: SlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group slides for vertical nesting
  const groups: Slide[][] = [];
  for (const slide of slides) {
    if (slide.vertical && groups.length > 0) {
      groups[groups.length - 1].push(slide);
    } else {
      groups.push([slide]);
    }
  }

  useEffect(() => {
    const link1 = document.createElement("link");
    link1.rel = "stylesheet";
    link1.href = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css";
    document.head.appendChild(link1);

    const link2 = document.createElement("link");
    link2.rel = "stylesheet";
    link2.href = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css";
    document.head.appendChild(link2);

    const style = document.createElement("style");
    style.textContent = `
      .reveal .slide-logo { position: absolute; top: 20px; right: 20px; height: 40px; opacity: 0.8; }
      .reveal .highlight-text { font-size: 2em; font-weight: bold; color: #60a5fa; }
      .reveal .highlight-sub { font-size: 0.9em; color: #9ca3af; margin-top: 0.5em; }
      .reveal .two-col { display: flex; gap: 2em; text-align: left; }
      .reveal .two-col > div { flex: 1; }
      .reveal .title-slide h1 { font-size: 2.5em; }
      .reveal .title-slide p { font-size: 1.1em; color: #9ca3af; }
      .reveal ul { text-align: left; }
      .reveal li { margin-bottom: 0.5em; font-size: 0.8em; }
    `;
    document.head.appendChild(style);

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
        transition: "slide",
        transitionSpeed: "default",
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
      style.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-sm text-gray-400">{projectName} - Slide Deck</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
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
            {groups.map((group, gi) => {
              if (group.length === 1) {
                return (
                  <section
                    key={gi}
                    data-transition={group[0].layout === "title" ? "zoom" : "slide"}
                  >
                    <SlideContent slide={group[0]} logoUrl={logoUrl} />
                  </section>
                );
              }
              return (
                <section key={gi}>
                  {group.map((slide, si) => (
                    <section
                      key={si}
                      data-transition={si === 0 ? "slide" : "fade"}
                    >
                      <SlideContent slide={slide} logoUrl={logoUrl} />
                    </section>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideContent({ slide, logoUrl }: { slide: Slide; logoUrl?: string | null }) {
  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} className="slide-logo" alt="Logo" />
  ) : null;

  switch (slide.layout) {
    case "title":
      return (
        <>
          {logo}
          <div className="title-slide">
            <h1>{slide.title}</h1>
            {slide.bullets[0] && <p>{slide.bullets[0]}</p>}
          </div>
        </>
      );

    case "highlight":
      return (
        <>
          {logo}
          <h3>{slide.title}</h3>
          <div className="highlight-text">{slide.bullets[0] ?? ""}</div>
          {slide.bullets[1] && <div className="highlight-sub">{slide.bullets[1]}</div>}
        </>
      );

    case "two-column": {
      const mid = Math.ceil(slide.bullets.length / 2);
      const left = slide.bullets.slice(0, mid);
      const right = slide.bullets.slice(mid);
      return (
        <>
          {logo}
          <h2>{slide.title}</h2>
          <div className="two-col">
            <div>
              <ul>{left.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div>
              <ul>{right.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          </div>
        </>
      );
    }

    default:
      return (
        <>
          {logo}
          <h2>{slide.title}</h2>
          <ul>
            {slide.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </>
      );
  }
}
