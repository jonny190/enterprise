/**
 * Browser download helpers.
 *
 * Client-side only: these touch `document` and `URL.createObjectURL`, so never
 * import this from a Server Component.
 */

/** Save a Blob to the user's machine under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Firefox only fires the click on an anchor that is in the document.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Save an in-memory string as a file. */
export function downloadText(
  content: string,
  filename: string,
  mimeType: string
): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}

/**
 * POST `content` to one of the export routes and save the response.
 *
 * `ext` must match what the endpoint actually returns: `/api/export/word`
 * returns a .docx, but `/api/export/pdf` returns a print-ready HTML document,
 * so its extension is "html".
 */
export async function downloadFromApi(
  endpoint: string,
  content: string,
  filename: string,
  ext: string
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) return;
  downloadBlob(await res.blob(), `${filename}.${ext}`);
}
