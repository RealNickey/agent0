/**
 * Google API Configuration and Helpers
 * 
 * This module provides utilities for interacting with Google APIs
 * including OAuth2 token management and API client initialization.
 * Supports Google Calendar and Gmail APIs.
 */

import fs from "fs";
import path from "path";

// Google API scopes (Calendar + Gmail + Tasks + Contacts)
export const GOOGLE_CALENDAR_SCOPES = [
  // Calendar scopes
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  // Gmail scopes
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  // Tasks scopes
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/tasks.readonly",
  // Contacts / People API — for sender profile pictures
  "https://www.googleapis.com/auth/contacts.readonly",
];

// Google Forms API scopes
export const GOOGLE_FORMS_SCOPES = [
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.body.readonly",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/drive.file",
];

// Combined scopes for both Calendar and Forms
export const GOOGLE_ALL_SCOPES = [...GOOGLE_CALENDAR_SCOPES, ...GOOGLE_FORMS_SCOPES];

// Environment variables for Google OAuth
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

// Google Calendar API base URL
export const CALENDAR_API_BASE_URL = "https://www.googleapis.com/calendar/v3";

/**
 * Token storage interface
 * In production, this should be stored securely (database, encrypted storage)
 */
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
  scope?: string;
}

// File path for local token storage
const TOKEN_FILE_PATH = path.join(process.cwd(), ".google-tokens.json");

// In-memory cache for tokens
let tokenStore: Map<string, GoogleTokens> = new Map();

// Initialize token store from file
try {
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    const data = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
    const json = JSON.parse(data);
    tokenStore = new Map(Object.entries(json));
  }
} catch (error) {
  console.error("Failed to load tokens from file:", error);
}

/**
 * Save tokens to file
 */
function saveTokensToFile() {
  try {
    const obj = Object.fromEntries(tokenStore);
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error("Failed to save tokens to file:", error);
  }
}

/**
 * Store tokens for a user
 */
export function storeTokens(userId: string, tokens: GoogleTokens): void {
  tokenStore.set(userId, tokens);
  saveTokensToFile();
}

/**
 * Get tokens for a user
 */
export function getTokens(userId: string): GoogleTokens | undefined {
  // Always reload from file to ensure we have the latest tokens
  // This is crucial for Next.js dev server which might run routes in different isolated contexts
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const json = JSON.parse(data);
      tokenStore = new Map(Object.entries(json));
    }
  } catch (error) {
    console.error("Failed to reload tokens:", error);
  }

  return tokenStore.get(userId);
}

/**
 * Remove tokens for a user
 */
export function removeTokens(userId: string): void {
  tokenStore.delete(userId);
  saveTokensToFile();
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(tokens: GoogleTokens): boolean {
  if (!tokens.expires_at) return false;
  // Add 5 minute buffer
  return Date.now() > (tokens.expires_at - 5 * 60 * 1000);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    const data = await response.json();
    
    return {
      access_token: data.access_token,
      refresh_token: refreshToken, // Keep the same refresh token
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
      scope: data.scope,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = getTokens(userId);
  
  if (!tokens) {
    return null;
  }

  if (isTokenExpired(tokens) && tokens.refresh_token) {
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    if (newTokens) {
      storeTokens(userId, newTokens);
      return newTokens.access_token;
    }
    return null;
  }

  return tokens.access_token;
}

/**
 * Generate OAuth2 authorization URL
 * @param state - State parameter for CSRF protection
 * @param service - Which service to authorize: 'calendar', 'forms', or 'all'
 */
export function getAuthorizationUrl(state?: string, service: 'calendar' | 'forms' | 'tasks' | 'gmail' | 'all' = 'calendar'): string {
  let scopes: string[];
  switch (service) {
    case 'forms':
      scopes = GOOGLE_FORMS_SCOPES;
      break;
    case 'tasks':
      scopes = GOOGLE_CALENDAR_SCOPES; // Tasks scopes are included in calendar scopes
      break;
    case 'gmail':
      scopes = GOOGLE_CALENDAR_SCOPES; // Gmail scopes are included in calendar scopes
      break;
    case 'all':
      scopes = GOOGLE_ALL_SCOPES;
      break;
    default:
      scopes = GOOGLE_CALENDAR_SCOPES;
  }

  // Encode service in state for callback to know which service was authorized
  const stateWithService = state ? `${state}:${service}` : service;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: stateWithService,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      console.error("Failed to exchange code:", await response.text());
      return null;
    }

    const data = await response.json();
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type,
      scope: data.scope,
    };
  } catch (error) {
    console.error("Error exchanging code:", error);
    return null;
  }
}

/**
 * Make authenticated request to Google Calendar API
 */
export async function calendarRequest<T>(
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
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${CALENDAR_API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content (e.g., for delete operations)
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
 * Format date for Google Calendar API
 * Handles both dateTime (for timed events) and date (for all-day events)
 */
export function formatEventDateTime(
  dateString: string,
  timeZone?: string
): { dateTime: string; timeZone?: string } | { date: string } {
  // Check if it's an all-day event (no time component)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { date: dateString };
  }
  
  // For datetime strings, ensure ISO format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return {
    dateTime: date.toISOString(),
    ...(timeZone && { timeZone }),
  };
}

/**
 * Parse Google Calendar event response to simplified format
 */
export interface SimplifiedEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  htmlLink: string;
  status: string;
  created?: string;
  updated?: string;
}

export function parseEventResponse(event: any): SimplifiedEvent {
  return {
    id: event.id,
    summary: event.summary || "(No title)",
    description: event.description,
    location: event.location,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    organizer: event.organizer && {
      email: event.organizer.email,
      displayName: event.organizer.displayName,
    },
    htmlLink: event.htmlLink,
    status: event.status,
    created: event.created,
    updated: event.updated,
  };
}
