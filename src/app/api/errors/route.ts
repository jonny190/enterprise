import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { type TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { fetchRepoContext, formatRepoContext } from "@/modules/generation/lib/repo-context";

const client = new Anthropic();

// POST: Analyze an error with AI using repo context
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { errorId } = await req.json();

  const errorLog = await prisma.errorLog.findUniqueOrThrow({
    where: { id: errorId },
    include: {
      project: {
        include: {
          org: { include: { memberships: { where: { userId: session.user.id } } } },
        },
      },
    },
  });

  if (errorLog.project.org.memberships.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch repo context if available
  let repoSection = "";
  if (errorLog.project.gitRepo) {
    const ctx = await fetchRepoContext(errorLog.project.gitRepo);
    if (ctx) repoSection = formatRepoContext(ctx);
  }

  const systemPrompt = `You are a senior software engineer debugging an error in a project. You have access to the project's repository structure and README below. Analyze the error and provide:

1. **Root Cause Analysis** - What is likely causing this error based on the stack trace, context, and codebase structure
2. **Suggested Fix** - Specific code changes or steps to fix the issue, referencing actual file paths from the repo structure where possible
3. **Prevention** - How to prevent this type of error from recurring (tests, validation, patterns)

Be specific and reference actual files from the repository when possible. Format your response in markdown.

${repoSection}`;

  const userPrompt = `# Error: ${errorLog.title}

## Stack Trace
\`\`\`
${errorLog.stackTrace || "No stack trace provided"}
\`\`\`

## Context
${errorLog.context || "No additional context provided"}

## Source
${errorLog.source || "Not specified"}

Please analyze this error and suggest a fix.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((c): c is TextBlock => c.type === "text");
    const analysis = textBlock?.text ?? "Unable to analyze this error.";

    // Extract a concise suggested fix (first code block or first paragraph after "Suggested Fix")
    const fixMatch = analysis.match(/##\s*Suggested Fix[\s\S]*?```[\s\S]*?```/);
    const suggestedFix = fixMatch ? fixMatch[0] : "";

    // Save analysis to the error log
    await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        aiAnalysis: analysis,
        suggestedFix,
        status: "investigating",
      },
    });

    return Response.json({ analysis, suggestedFix });
  } catch (error) {
    console.error("[errors] analysis failed", error);
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
