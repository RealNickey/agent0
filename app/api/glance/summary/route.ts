import { NextResponse } from "next/server";
import { getValidAccessToken, calendarRequest } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

/**
 * GET /api/glance/summary
 * Returns live counts for the "At a Glance" widget:
 * - emailCount:   unread inbox emails received today
 * - meetingCount: today's timed calendar events (fallback: Gmail ICS invites today)
 */
export async function GET() {
  const accessToken = await getValidAccessToken(DEFAULT_USER_ID);

  if (!accessToken) {
    return NextResponse.json({
      emailCount: 0,
      meetingCount: 0,
      isGmailConnected: false,
      isCalendarConnected: false,
    });
  }

  // Today's date in Gmail `after:` format (YYYY/MM/DD)
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  // ── Email count: unread inbox messages received today ──────────────────────
  // Use maxResults=50 and count actual messages[] — resultSizeEstimate is a
  // rough global estimate and does NOT reflect the `after:` date filter.
  let emailCount = 0;
  try {
    const emailQuery = `is:unread is:inbox after:${dateStr}`;
    const emailRes = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=50&q=${encodeURIComponent(emailQuery)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      emailCount = (emailData.messages as unknown[] | undefined)?.length ?? 0;
    }
  } catch {
    // Gmail fetch failed — keep 0
  }

  // ── Meeting count: today's timed calendar events ───────────────────────────
  let meetingCount = 0;
  let isCalendarConnected = false;

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  // Use `now` as timeMin so only upcoming (not past) meetings are counted
  const calParams = new URLSearchParams({
    orderBy: "startTime",
    singleEvents: "true",
    timeMin: today.toISOString(),
    timeMax: endOfDay.toISOString(),
    maxResults: "50",
    fields: "items(id,start)",
  });

  const calResult = await calendarRequest<{
    items?: Array<{ id: string; start: { dateTime?: string; date?: string } }>;
  }>(accessToken, `/calendars/primary/events?${calParams}`);

  if (calResult.success) {
    isCalendarConnected = true;
    const items = calResult.data?.items ?? [];
    // Count only timed events (not all-day) — these are all upcoming since timeMin=now
    meetingCount = items.filter((item) => !!item.start?.dateTime).length;
  } else {
    // Fallback: count unread Gmail meeting invites (ICS attachments) received today
    try {
      const inviteQuery = `has:attachment filename:ics is:unread after:${dateStr}`;
      const inviteRes = await fetch(
        `${GMAIL_API_BASE}/users/me/messages?maxResults=1&q=${encodeURIComponent(inviteQuery)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (inviteRes.ok) {
        const inviteData = await inviteRes.json();
        meetingCount = inviteData.resultSizeEstimate ?? 0;
      }
    } catch {
      // Keep 0
    }
  }

  return NextResponse.json({
    emailCount,
    meetingCount,
    isGmailConnected: true,
    isCalendarConnected,
  });
}
