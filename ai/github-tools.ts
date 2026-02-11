import { tool } from "ai";
import { z } from "zod";
import { getGitHubAccessToken, githubRequest } from "@/lib/github";

/**
 * GitHub Tools for Agent0
 *
 * Invoked via the @github mention.  Provides five tools:
 *   listRepos, getRepoSummary, listIssues, getPullRequests, readFile
 */

// ── helper ────────────────────────────────────────────────────
async function requireToken() {
  const token = getGitHubAccessToken();
  if (!token) {
    throw new Error(
      "GitHub is not connected. Please add the GitHub integration first."
    );
  }
  return token;
}

// ── listRepos ─────────────────────────────────────────────────
const listRepos = tool({
  description:
    "List GitHub repositories for the authenticated user, or for a given username / org.",
  inputSchema: z.object({
    owner: z
      .string()
      .optional()
      .describe(
        "GitHub username or org. If omitted lists repos of the authenticated user."
      ),
    type: z
      .enum(["all", "owner", "public", "private", "member"])
      .optional()
      .describe("Filter repos by type (default: all)"),
    sort: z
      .enum(["created", "updated", "pushed", "full_name"])
      .optional()
      .describe("Sort order (default: updated)"),
    perPage: z
      .number()
      .optional()
      .describe("Number of results per page (max 100, default 30)"),
  }),
  execute: async ({ owner, type = "all", sort = "updated", perPage = 30 }) => {
    const token = await requireToken();
    const endpoint = owner
      ? `/users/${encodeURIComponent(owner)}/repos?type=${type}&sort=${sort}&per_page=${perPage}`
      : `/user/repos?type=${type}&sort=${sort}&per_page=${perPage}`;

    const res = await githubRequest<any[]>(token, endpoint);
    if (!res.success) return { error: true, message: res.error };

    return {
      error: false,
      count: res.data!.length,
      repos: res.data!.map((r: any) => ({
        name: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        openIssues: r.open_issues_count,
        updatedAt: r.updated_at,
        url: r.html_url,
        private: r.private,
      })),
    };
  },
});

// ── getRepoSummary ────────────────────────────────────────────
const getRepoSummary = tool({
  description:
    "Get a summary of a GitHub repository including README, stats, and recent activity.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (user or org)"),
    repo: z.string().describe("Repository name"),
  }),
  execute: async ({ owner, repo }) => {
    const token = await requireToken();
    const o = encodeURIComponent(owner);
    const r = encodeURIComponent(repo);

    // Fetch repo metadata + README in parallel
    const [repoRes, readmeRes, languagesRes] = await Promise.all([
      githubRequest<any>(token, `/repos/${o}/${r}`),
      githubRequest<any>(token, `/repos/${o}/${r}/readme`),
      githubRequest<any>(token, `/repos/${o}/${r}/languages`),
    ]);

    if (!repoRes.success) return { error: true, message: repoRes.error };

    const data = repoRes.data!;
    let readmeContent: string | null = null;
    if (readmeRes.success && readmeRes.data?.content) {
      try {
        readmeContent = Buffer.from(readmeRes.data.content, "base64").toString(
          "utf-8"
        );
        // Truncate very long READMEs
        if (readmeContent.length > 3000) {
          readmeContent = readmeContent.slice(0, 3000) + "\n\n...(truncated)";
        }
      } catch {
        readmeContent = null;
      }
    }

    return {
      error: false,
      name: data.full_name,
      description: data.description,
      language: data.language,
      languages: languagesRes.success ? languagesRes.data : undefined,
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      openIssues: data.open_issues_count,
      defaultBranch: data.default_branch,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      license: data.license?.name,
      topics: data.topics,
      url: data.html_url,
      private: data.private,
      readme: readmeContent,
    };
  },
});

// ── listIssues ────────────────────────────────────────────────
const listIssues = tool({
  description:
    "List issues for a GitHub repository with optional filters.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Issue state filter (default: open)"),
    labels: z
      .string()
      .optional()
      .describe("Comma-separated list of label names to filter by"),
    sort: z
      .enum(["created", "updated", "comments"])
      .optional()
      .describe("Sort field (default: created)"),
    direction: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort direction (default: desc)"),
    perPage: z
      .number()
      .optional()
      .describe("Results per page (max 100, default 30)"),
  }),
  execute: async ({
    owner,
    repo,
    state = "open",
    labels,
    sort = "created",
    direction = "desc",
    perPage = 30,
  }) => {
    const token = await requireToken();
    const params = new URLSearchParams({
      state,
      sort,
      direction,
      per_page: String(perPage),
    });
    if (labels) params.set("labels", labels);

    const res = await githubRequest<any[]>(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params}`
    );
    if (!res.success) return { error: true, message: res.error };

    // Filter out pull requests (GitHub lists PRs under /issues too)
    const issues = res.data!.filter((i: any) => !i.pull_request);

    return {
      error: false,
      count: issues.length,
      issues: issues.map((i: any) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        author: i.user?.login,
        labels: i.labels?.map((l: any) => l.name),
        comments: i.comments,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        url: i.html_url,
        body: i.body ? (i.body.length > 500 ? i.body.slice(0, 500) + "..." : i.body) : null,
      })),
    };
  },
});

// ── getPullRequests ───────────────────────────────────────────
const getPullRequests = tool({
  description:
    "List pull requests for a GitHub repository with optional filters.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("PR state filter (default: open)"),
    sort: z
      .enum(["created", "updated", "popularity", "long-running"])
      .optional()
      .describe("Sort field (default: created)"),
    direction: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort direction (default: desc)"),
    perPage: z
      .number()
      .optional()
      .describe("Results per page (max 100, default 30)"),
  }),
  execute: async ({
    owner,
    repo,
    state = "open",
    sort = "created",
    direction = "desc",
    perPage = 30,
  }) => {
    const token = await requireToken();
    const params = new URLSearchParams({
      state,
      sort,
      direction,
      per_page: String(perPage),
    });

    const res = await githubRequest<any[]>(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params}`
    );
    if (!res.success) return { error: true, message: res.error };

    return {
      error: false,
      count: res.data!.length,
      pullRequests: res.data!.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login,
        labels: pr.labels?.map((l: any) => l.name),
        draft: pr.draft,
        mergeable: pr.mergeable,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        url: pr.html_url,
        head: pr.head?.ref,
        base: pr.base?.ref,
        body: pr.body ? (pr.body.length > 500 ? pr.body.slice(0, 500) + "..." : pr.body) : null,
      })),
    };
  },
});

// ── readFile ──────────────────────────────────────────────────
const readFile = tool({
  description:
    "Read the contents of a file (or list a directory) in a GitHub repository.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    path: z
      .string()
      .optional()
      .describe(
        "File or directory path within the repo (default: root '/')"
      ),
    ref: z
      .string()
      .optional()
      .describe(
        "Branch, tag, or commit SHA (default: repo's default branch)"
      ),
  }),
  execute: async ({ owner, repo, path: filePath = "", ref }) => {
    const token = await requireToken();
    const o = encodeURIComponent(owner);
    const r = encodeURIComponent(repo);
    const p = filePath
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    let endpoint = `/repos/${o}/${r}/contents/${p}`;
    if (ref) endpoint += `?ref=${encodeURIComponent(ref)}`;

    const res = await githubRequest<any>(token, endpoint);
    if (!res.success) return { error: true, message: res.error };

    const data = res.data!;

    // Directory listing
    if (Array.isArray(data)) {
      return {
        error: false,
        type: "directory",
        path: filePath || "/",
        entries: data.map((e: any) => ({
          name: e.name,
          type: e.type, // "file" | "dir" | "symlink" | "submodule"
          size: e.size,
          path: e.path,
        })),
      };
    }

    // Single file
    let content: string | null = null;
    if (data.content) {
      try {
        content = Buffer.from(data.content, "base64").toString("utf-8");
        // Truncate very large files
        if (content.length > 8000) {
          content = content.slice(0, 8000) + "\n\n...(truncated)";
        }
      } catch {
        content = null;
      }
    }

    return {
      error: false,
      type: "file",
      path: data.path,
      size: data.size,
      sha: data.sha,
      encoding: data.encoding,
      content,
      url: data.html_url,
    };
  },
});

// ── Export ─────────────────────────────────────────────────────
export const githubTools = {
  listRepos,
  getRepoSummary,
  listIssues,
  getPullRequests,
  readGitHubFile: readFile,
};
