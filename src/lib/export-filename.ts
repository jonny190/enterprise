/**
 * Helpers for the document export routes.
 *
 * The `filename` and `content` fields on these routes come straight from the
 * client, so both need sanitising before they reach an HTTP header or an HTML
 * document.
 */

const FALLBACK_FILENAME = "export";

/**
 * Reduce a client-supplied filename to a safe, non-empty ASCII basename.
 *
 * Strips path separators, quotes, control characters and anything else that
 * could break out of a quoted `Content-Disposition` value or traverse a path.
 * Call this before appending an extension.
 */
export function safeFilename(input: unknown): string {
  if (typeof input !== "string") return FALLBACK_FILENAME;

  const cleaned = input
    .replace(/[\\/]/g, "-")
    // Allowlist: anything outside this set (quotes, newlines, control
    // characters, non-ASCII) is dropped.
    .replace(/[^A-Za-z0-9._ -]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 100)
    .trim();

  return cleaned.length > 0 ? cleaned : FALLBACK_FILENAME;
}

/** Escape a string for interpolation into HTML text or an attribute value. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
