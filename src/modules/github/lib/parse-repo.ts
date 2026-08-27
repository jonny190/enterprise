/**
 * Pull the owner and repo out of a GitHub URL.
 *
 * Accepts both HTTPS and SSH forms, e.g.
 *   https://github.com/acme/widgets
 *   git@github.com:acme/widgets.git
 *
 * Returns null for anything that is not a recognisable GitHub repository URL.
 *
 * Note: the repo pattern deliberately stops at a dot, which is what strips the
 * trailing `.git` on SSH URLs. Widening it would also change which repository
 * names resolve, so leave it alone unless that is the intent.
 */
export function parseGitHubRepo(
  url: string
): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
