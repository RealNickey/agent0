/**
 * GitHub API Configuration and Helpers
 *
 * Provides OAuth2 token management and a thin REST wrapper
 * for the GitHub API.  Mirrors the pattern in google-calendar.ts.
 */

import fs from "fs";
import path from "path";

// ── Environment ──────────────────────────────────────────────
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
export const GITHUB_REDIRECT_URI =
  process.env.GITHUB_REDIRECT_URI ||
  "http://localhost:3000/api/auth/github/callback";

const GITHUB_API_BASE = "https://api.github.com";

// ── Token storage ────────────────────────────────────────────
export interface GitHubTokens {
  access_token: string;
  token_type: string;
  scope?: string;
}

const TOKEN_FILE_PATH = path.join(process.cwd(), ".github-tokens.json");

let tokenStore: Map<string, GitHubTokens> = new Map();

// Initialise from disk
try {
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    const data = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
    const json = JSON.parse(data);
    tokenStore = new Map(Object.entries(json));
  }
} catch (error) {
  console.error("Failed to load GitHub tokens from file:", error);
}

function saveTokensToFile() {
  try {
    const obj = Object.fromEntries(tokenStore);
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error("Failed to save GitHub tokens to file:", error);
  }
}

export function storeGitHubTokens(userId: string, tokens: GitHubTokens): void {
  tokenStore.set(userId, tokens);
  saveTokensToFile();
}

export function getGitHubTokens(userId: string): GitHubTokens | undefined {
  // Always reload from file for multi-process sync
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const json = JSON.parse(data);
      tokenStore = new Map(Object.entries(json));
    }
  } catch {
    /* ignore */
  }
  return tokenStore.get(userId);
}

export function removeGitHubTokens(userId: string): void {
  tokenStore.delete(userId);
  saveTokensToFile();
}

// ── OAuth helpers ────────────────────────────────────────────
export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "repo read:user",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(
  code: string
): Promise<GitHubTokens> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  return data as GitHubTokens;
}

// ── Authenticated API request ────────────────────────────────
export async function githubRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
    };
    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errorData as any)?.message ||
          `GitHub API ${response.status}: ${response.statusText}`,
      };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown GitHub API error",
    };
  }
}

// ── Convenience: get access token for default dev user ───────
const DEFAULT_USER_ID = "default-user";

export function getGitHubAccessToken(): string | null {
  const tokens = getGitHubTokens(DEFAULT_USER_ID);
  return tokens?.access_token ?? null;
}
