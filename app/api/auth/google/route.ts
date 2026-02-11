import { NextResponse } from "next/server";
import { getAuthorizationUrl, getTokens } from "@/lib/google-calendar";

// Default user ID for development (in production, get from auth session)
const DEFAULT_USER_ID = "default-user";

/**
 * GET /api/auth/google - Initiate Google OAuth flow or check status
 * Query params:
 *   - action=status: Check if connected
 *   - service=calendar|forms|tasks|all: Which service to authorize (default: calendar)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const service = (searchParams.get("service") as 'calendar' | 'forms' | 'tasks' | 'slides' | 'all') || 'calendar';

  // Check connection status
  if (action === "status") {
    const tokens = getTokens(DEFAULT_USER_ID);
    // Check if tokens have the required scopes for the requested service
    const hasCalendarScopes = tokens?.scope?.includes("calendar");
    const hasFormsScopes = tokens?.scope?.includes("forms.body");
    const hasTasksScopes = tokens?.scope?.includes("tasks");
    
    return Response.json({
      connected: !!tokens,
      hasRefreshToken: !!tokens?.refresh_token,
      hasCalendarScopes,
      hasFormsScopes,
      hasTasksScopes,
      scopes: tokens?.scope,
    });
  }

  // Redirect to Google OAuth with appropriate scopes
  const state = DEFAULT_USER_ID; // In production, use a secure state token
  // Slides uses the same forms scopes (drive.file) for uploading to Drive
  const authService = service === 'slides' ? 'forms' : service;
  const authUrl = getAuthorizationUrl(state, authService);

  return NextResponse.redirect(authUrl);
}

/**
 * DELETE /api/auth/google - Disconnect Google account
 */
export async function DELETE() {
  const { removeTokens } = await import("@/lib/google-calendar");
  
  removeTokens(DEFAULT_USER_ID);
  
  return Response.json({ disconnected: true });
}
