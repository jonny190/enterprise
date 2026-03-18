"use client";

import { Button } from "@/components/ui/button";

export function ExportButtons({
  content,
  projectName,
}: {
  content: string;
  projectName: string;
}) {
  function downloadMarkdown() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadWord() {
    const res = await fetch("/api/export/word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename: projectName }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    const res = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename: projectName }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={downloadMarkdown}>
        .md
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPdf}>
        .pdf
      </Button>
      <Button variant="outline" size="sm" onClick={downloadWord}>
        .docx
      </Button>
    </>
  );
}
