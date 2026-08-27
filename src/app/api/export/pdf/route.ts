import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { safeFilename, escapeHtml } from "@/lib/export-filename";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { content, filename } = await req.json();

  if (typeof content !== "string") {
    return new Response("Invalid content", { status: 400 });
  }

  const safeName = safeFilename(filename);

  // Generate a print-ready HTML file that opens as a PDF in the browser.
  // @react-pdf/renderer has known SSR/edge-runtime incompatibilities with Next.js 16,
  // so we produce an HTML document with print styles that the browser can save as PDF.
  const escaped = escapeHtml(content);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(safeName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #111;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
    }
    @media print {
      body { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.html"`,
    },
  });
}
