"use client";

import { Button } from "@/components/ui/button";
import { downloadText, downloadFromApi } from "@/lib/download";

export function ExportButtons({
  content,
  projectName,
}: {
  content: string;
  projectName: string;
}) {
  function downloadMarkdown() {
    downloadText(content, `${projectName}.md`, "text/markdown");
  }

  async function downloadWord() {
    await downloadFromApi("/api/export/word", content, projectName, "docx");
  }

  async function downloadPdf() {
    // /api/export/pdf returns a print-ready HTML document, not a PDF.
    await downloadFromApi("/api/export/pdf", content, projectName, "html");
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
