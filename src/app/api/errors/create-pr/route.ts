import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// POST: Create a GitHub PR with the suggested fix for an error
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

  if (!errorLog.aiAnalysis) {
    return Response.json({ error: "Run AI analysis first before creating a PR" }, { status: 400 });
  }

  const githubToken = errorLog.project.org.githubToken;
  if (!githubToken) {
    return Response.json({ error: "No GitHub token configured. Add one in org settings." }, { status: 400 });
  }

  const repoUrl = errorLog.project.gitRepo;
  if (!repoUrl) {
    return Response.json({ error: "No git repository linked to this project" }, { status: 400 });
  }

  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) {
    return Response.json({ error: "Only GitHub repositories are supported for PR creation" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "enterprise-app",
    "Content-Type": "application/json",
  };

  try {
    // 1. Get the default branch and its latest commit SHA
    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers }
    );
    if (!repoRes.ok) {
      const err = await repoRes.json();
      return Response.json({ error: `GitHub API error: ${err.message}` }, { status: 400 });
    }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch;

    const refRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/ref/heads/${defaultBranch}`,
      { headers }
    );
    if (!refRes.ok) {
      return Response.json({ error: "Could not read default branch" }, { status: 400 });
    }
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // 2. Create a new branch
    const branchName = `fix/error-${errorLog.id.slice(0, 8)}`;
    const createBranchRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/refs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
      }
    );
    if (!createBranchRes.ok) {
      const err = await createBranchRes.json();
      return Response.json({ error: `Failed to create branch: ${err.message}` }, { status: 400 });
    }

    // 3. Create a fix description file on the branch
    const fixContent = `# Error Fix: ${errorLog.title}\n\n${errorLog.aiAnalysis}`;
    const encodedContent = Buffer.from(fixContent).toString("base64");

    await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/.fixes/${errorLog.id.slice(0, 8)}.md`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `fix: ${errorLog.title}`,
          content: encodedContent,
          branch: branchName,
        }),
      }
    );

    // 4. Create PR
    const prBody = `## Error Report

**Title:** ${errorLog.title}
**Status:** ${errorLog.status}
**Source:** ${errorLog.source || "Not specified"}

## Stack Trace
\`\`\`
${errorLog.stackTrace || "No stack trace"}
\`\`\`

## Context
${errorLog.context || "No additional context"}

## AI Analysis

${errorLog.aiAnalysis}

---
Created automatically by [Enterprise Requirements Platform](${process.env.NEXT_PUBLIC_APP_URL || "https://enterprise.coria.app"})`;

    const prRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: `fix: ${errorLog.title}`,
          body: prBody,
          head: branchName,
          base: defaultBranch,
        }),
      }
    );

    if (!prRes.ok) {
      const err = await prRes.json();
      return Response.json({ error: `Failed to create PR: ${err.message}` }, { status: 400 });
    }

    const prData = await prRes.json();
    const prUrl = prData.html_url;

    // 5. Save PR URL to error log
    await prisma.errorLog.update({
      where: { id: errorId },
      data: { prUrl },
    });

    return Response.json({ prUrl });
  } catch (error) {
    return Response.json({
      error: `PR creation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    }, { status: 500 });
  }
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
