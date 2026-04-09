type CreateRepoSuccess = { url: string };
type CreateRepoError = { error: string };
type CreateRepoResult = CreateRepoSuccess | CreateRepoError;

export async function createGithubRepo(
  token: string,
  name: string,
  isPrivate: boolean
): Promise<CreateRepoResult> {
  try {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { url: data.html_url };
    }

    if (response.status === 401) {
      return { error: "GitHub token is invalid or expired. Check your org settings." };
    }

    if (response.status === 422) {
      return { error: `A repository named '${name}' already exists. Choose a different name.` };
    }

    if (response.status === 403) {
      return { error: "GitHub API rate limit reached. Repository was not created." };
    }

    return { error: "Could not reach GitHub. Repository was not created." };
  } catch {
    return { error: "Could not reach GitHub. Repository was not created." };
  }
}
