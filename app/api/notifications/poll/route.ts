import { NextResponse } from "next/server";
import { getValidAccessToken, calendarRequest } from "@/lib/google-calendar";
import { isToolInstalled } from "@/lib/installed-tools";

const DEFAULT_USER_ID = "default-user";
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

interface NotificationItem {
  id: string;
  type: "calendar" | "email";
  title: string;
  body: string;
  timestamp: string;
  link?: string;
}

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
}

interface CalendarEventsResponse {
  items?: CalendarEvent[];
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
}

interface GmailMessageResponse {
  id: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
}

function formatTimeRange(start?: string, end?: string): string {
  if (!start) return "All day event";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  const startStr = startDate.toLocaleTimeString("en-US", timeOpts);
  const endStr = endDate ? endDate.toLocaleTimeString("en-US", timeOpts) : "";
  return endStr ? `${startStr} – ${endStr}` : startStr;
}

async function fetchCalendarNotifications(accessToken: string): Promise<NotificationItem[]> {
  const now = new Date();
  const in15min = new Date(now.getTime() + 15 * 60 * 1000);

  const endpoint = `/calendars/primary/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(in15min.toISOString())}&singleEvents=true&orderBy=startTime`;
  
  const result = await calendarRequest<CalendarEventsResponse>(accessToken, endpoint, "GET");

  if (!result.success || !result.data?.items) {
    return [];
  }

  return result.data.items.map((event) => ({
    id: `cal-${event.id}`,
    type: "calendar" as const,
    title: event.summary || "Untitled Event",
    body: formatTimeRange(event.start?.dateTime || event.start?.date, event.end?.dateTime || event.end?.date),
    timestamp: event.start?.dateTime || event.start?.date || now.toISOString(),
    link: event.htmlLink,
  }));
}

async function gmailRequest<T>(
  accessToken: string,
  endpoint: string,
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
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

async function fetchGmailNotifications(accessToken: string): Promise<NotificationItem[]> {
  const query = encodeURIComponent("is:unread (is:important OR is:starred)");
  const listResult = await gmailRequest<GmailListResponse>(
    accessToken,
    `/users/me/messages?q=${query}&maxResults=5`,
  );

  if (!listResult.success || !listResult.data?.messages?.length) {
    return [];
  }

  const notifications: NotificationItem[] = [];

  for (const msg of listResult.data.messages) {
    const msgResult = await gmailRequest<GmailMessageResponse>(
      accessToken,
      `/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    );

    if (!msgResult.success || !msgResult.data?.payload?.headers) continue;

    const headers = msgResult.data.payload.headers;
    const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
    const from = headers.find((h) => h.name === "From")?.value || "Unknown";
    const date = headers.find((h) => h.name === "Date")?.value || new Date().toISOString();

    notifications.push({
      id: `email-${msg.id}`,
      type: "email",
      title: subject,
      body: `From: ${from}`,
      timestamp: date,
      link: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
    });
  }

  return notifications;
}

export async function GET() {
  const notifications: NotificationItem[] = [];

  try {
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);

    if (!accessToken) {
      return NextResponse.json({ notifications });
    }

    const promises: Promise<NotificationItem[]>[] = [];

    if (isToolInstalled("calendar")) {
      promises.push(fetchCalendarNotifications(accessToken));
    }

    if (isToolInstalled("gmail")) {
      promises.push(fetchGmailNotifications(accessToken));
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      notifications.push(...result);
    }
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
  }

  return NextResponse.json({ notifications });
}
