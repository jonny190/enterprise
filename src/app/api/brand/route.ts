import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOrgSettings } from "@/lib/permissions";
import FirecrawlApp from "@mendable/firecrawl-js";
import Anthropic from "@anthropic-ai/sdk";
import { type TextBlock } from "@anthropic-ai/sdk/resources/messages";

const anthropic = new Anthropic();

function resolveUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { orgId, url } = await req.json();

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { orgId, userId: session.user.id },
  });

  if (!membership || !canManageOrgSettings(membership.role)) {
    return Response.json(
      { error: "Only owners can manage brand settings" },
      { status: 403 }
    );
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return Response.json(
      { error: "Firecrawl is not configured. Set FIRECRAWL_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });

    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
    });

    if (!result.success || !result.markdown) {
      return Response.json(
        { error: "Could not scrape the website. Check the URL and try again." },
        { status: 422 }
      );
    }

    // Extract logo from metadata
    const metadata = result.metadata || {};
    const ogImage = metadata.ogImage
      ? resolveUrl(url, metadata.ogImage)
      : "";

    // Build favicon URL from the domain
    const faviconUrl = resolveUrl(url, "/favicon.ico");

    const pageContent = result.markdown.slice(0, 8000);

    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this company website content and extract brand information. Return ONLY valid JSON with these exact fields:

{
  "brandColors": "primary and accent colors mentioned or implied (e.g. 'Navy blue (#1a2b3c), Gold (#d4a017), White')",
  "brandTone": "the voice and tone of the brand (e.g. 'Professional, authoritative, approachable')",
  "brandDescription": "2-3 sentence summary of the brand identity, what the company does, and how they present themselves",
  "logoUrl": "URL of the company logo if found in the page content, or empty string if not found"
}

If you cannot determine a field, use an empty string. Do not guess colors that are not evident from the content.

The og:image for this site is: ${ogImage || "(not available)"}

Website URL: ${url}
Website content:
${pageContent}`,
        },
      ],
    });

    // Scan for the first text block rather than indexing content[0]: the first
    // block is not guaranteed to be text.
    const text =
      analysis.content.find((c): c is TextBlock => c.type === "text")?.text ??
      "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "Could not analyze brand from website content" },
        { status: 422 }
      );
    }

    const brand = JSON.parse(jsonMatch[0]);

    // Prefer Claude-identified logo, fall back to og:image
    const logoUrl = brand.logoUrl
      ? resolveUrl(url, brand.logoUrl)
      : ogImage;

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        website: url,
        logoUrl,
        faviconUrl,
        brandColors: brand.brandColors || "",
        brandTone: brand.brandTone || "",
        brandDescription: brand.brandDescription || "",
      },
    });

    return Response.json({
      success: true,
      brand: {
        website: url,
        logoUrl,
        faviconUrl,
        brandColors: brand.brandColors || "",
        brandTone: brand.brandTone || "",
        brandDescription: brand.brandDescription || "",
      },
    });
  } catch (error) {
    console.error("Brand scrape failed:", error);
    return Response.json(
      { error: "Failed to analyze website. Please try again." },
      { status: 500 }
    );
  }
}
