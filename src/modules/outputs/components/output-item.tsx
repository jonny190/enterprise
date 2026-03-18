"use client";

import { Button } from "@/components/ui/button";

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadFromApi(
  endpoint: string,
  content: string,
  filename: string,
  ext: string
) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OutputItem({
  id,
  content,
  editedContent,
  generatedAt,
  generatedByName,
  outputType,
  revisionNumber,
  changesOnly,
}: {
  id: string;
  content: string;
  editedContent: string | null;
  generatedAt: string;
  generatedByName: string;
  outputType: string;
  revisionNumber?: number | null;
  changesOnly?: boolean;
}) {
  const displayContent = editedContent || content;
  const filename = `${outputType}-${new Date(generatedAt).toISOString().slice(0, 10)}`;

  return (
    <details className="rounded-lg border border-gray-800">
      <summary className="cursor-pointer px-4 py-3 text-sm hover:bg-gray-800/50">
        <span className="font-medium">
          {new Date(generatedAt).toLocaleString()}
        </span>
        <span className="ml-2 text-gray-500">by {generatedByName}</span>
        {revisionNumber ? (
          <span className="ml-2 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-300 font-mono">
            V{revisionNumber}
          </span>
        ) : (
          <span className="ml-2 rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
            Current
          </span>
        )}
        {changesOnly && (
          <span className="ml-1 rounded bg-purple-900/50 px-1.5 py-0.5 text-xs text-purple-300">
            changes only
          </span>
        )}
        {editedContent && (
          <span className="ml-1 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
            edited
          </span>
        )}
      </summary>
      <div className="border-t border-gray-800 p-4">
        <div className="mb-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              download(displayContent, `${filename}.md`, "text/markdown")
            }
          >
            .md
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadFromApi("/api/export/word", displayContent, filename, "docx")
            }
          >
            .docx
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadFromApi("/api/export/pdf", displayContent, filename, "pdf")
            }
          >
            .pdf
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(displayContent)}
          >
            Copy
          </Button>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-300">
          {displayContent}
        </pre>
      </div>
    </details>
  );
}
