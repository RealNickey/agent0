/**
 * Google Forms API Configuration and Helpers
 * 
 * This module provides utilities for interacting with Google Forms API.
 * It reuses the OAuth token storage from google-calendar.ts to avoid
 * duplicate OAuth flows - both services share the same tokens.
 */

// Re-export token management from google-calendar (shared OAuth)
export {
  getTokens,
  storeTokens,
  removeTokens,
  getValidAccessToken,
  isTokenExpired,
  GOOGLE_FORMS_SCOPES,
  type GoogleTokens,
} from "./google-calendar";

import { getTokens, isTokenExpired } from "./google-calendar";

// Google Forms API base URL
export const FORMS_API_BASE_URL = "https://forms.googleapis.com/v1";

/**
 * Check if user has Forms scopes authorized
 */
export function hasFormsScopes(scopes?: string): boolean {
  if (!scopes) return false;
  return scopes.includes("forms.body");
}

/**
 * Make authenticated request to Google Forms API
 */
export async function formsRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${FORMS_API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Check if user has valid forms tokens
 */
export function hasValidTokens(userId: string): boolean {
  const tokens = getTokens(userId);
  if (!tokens) return false;
  if (!tokens.access_token) return false;
  // Check if tokens include forms scopes
  if (!hasFormsScopes(tokens.scope)) return false;
  // If expired but has refresh token, we can refresh
  if (isTokenExpired(tokens)) {
    return !!tokens.refresh_token;
  }
  return true;
}

/**
 * Get all forms for the authenticated user
 */
export async function listUserForms(accessToken: string): Promise<{ success: boolean; forms?: unknown[]; error?: string }> {
  // Google Forms API doesn't have a direct list endpoint
  // We need to use Drive API to list forms
  try {
    const driveResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files?" + new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.form'",
        fields: "files(id,name,createdTime,modifiedTime,webViewLink)",
        pageSize: "100",
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const errorData = await driveResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || "Failed to list forms",
      };
    }

    const data = await driveResponse.json();
    return {
      success: true,
      forms: data.files || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list forms",
    };
  }
}
