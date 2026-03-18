/**
 * Fetches repository context (file tree + README) from GitHub for use in AI generation prompts.
 */

type RepoContext = {
  fileTree: string;
  readme: string;
  defaultBranch: string;
};

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// Simple in-memory cache (survives within a single server process lifetime)
const cache = new Map<string, { data: RepoContext; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchRepoContext(repoUrl: string): Promise<RepoContext | null> {
  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) return null;

  const cacheKey = `${parsed.owner}/${parsed.repo}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "enterprise-app",
    };

    // Fetch repo info for default branch
    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers, cache: "no-store" }
    );
    if (!repoRes.ok) return null;
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch ?? "main";

    // Fetch file tree (recursive, but limited depth via truncation)
    const treeRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers, cache: "no-store" }
    );
    if (!treeRes.ok) return null;
    const treeData = await treeRes.json();

    const fileTree = buildFileTree(treeData.tree ?? [], treeData.truncated ?? false);

    // Fetch README
    let readme = "";
    const readmeRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`,
      { headers: { ...headers, Accept: "application/vnd.github.v3.raw" }, cache: "no-store" }
    );
    if (readmeRes.ok) {
      const fullReadme = await readmeRes.text();
      // Truncate to ~4000 chars to avoid bloating the prompt
      readme = fullReadme.length > 4000
        ? fullReadme.slice(0, 4000) + "\n\n[README truncated...]"
        : fullReadme;
    }

    const result: RepoContext = { fileTree, readme, defaultBranch };

    cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });

    return result;
  } catch {
    return null;
  }
}

function buildFileTree(
  items: { path: string; type: string }[],
  truncated: boolean
): string {
  // Filter out common noise
  const ignored = [
    "node_modules/", ".next/", ".git/", "dist/", "build/",
    ".DS_Store", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".env", ".env.local", ".vercel/",
  ];

  const filtered = items.filter((item) => {
    return !ignored.some((ig) => item.path.startsWith(ig) || item.path.includes(`/${ig}`));
  });

  // Limit to 200 entries to avoid enormous trees
  const limited = filtered.slice(0, 200);

  let tree = limited
    .map((item) => {
      const prefix = item.type === "tree" ? "dir " : "    ";
      return `${prefix}${item.path}`;
    })
    .join("\n");

  if (filtered.length > 200) {
    tree += `\n... and ${filtered.length - 200} more files`;
  }
  if (truncated) {
    tree += "\n(tree was truncated by GitHub API)";
  }

  return tree;
}

export function formatRepoContext(ctx: RepoContext): string {
  let section = "## Repository Structure\n\n";
  section += "```\n" + ctx.fileTree + "\n```\n\n";

  if (ctx.readme) {
    section += "## Repository README\n\n";
    section += ctx.readme + "\n\n";
  }

  return section;
}
