import { NextResponse } from "next/server";
import {
  getGitHubAuthUrl,
  getGitHubTokens,
  removeGitHubTokens,
} from "@/lib/github";

const DEFAULT_USER_ID = "default-user";

/**
 * GET /api/auth/github
 *   - ?action=status  → check if connected
 *   - otherwise       → redirect to GitHub OAuth
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "status") {
    const tokens = getGitHubTokens(DEFAULT_USER_ID);
    return Response.json({ connected: !!tokens });
  }

  const authUrl = getGitHubAuthUrl(DEFAULT_USER_ID);
  return NextResponse.redirect(authUrl);
}

/**
 * DELETE /api/auth/github — disconnect
 */
export async function DELETE() {
  removeGitHubTokens(DEFAULT_USER_ID);
  return Response.json({ disconnected: true });
}
