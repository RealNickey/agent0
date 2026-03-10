import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";
const PEOPLE_API_BASE = "https://people.googleapis.com/v1";

/**
 * GET /api/gmail/people?emails=a@b.com,c@d.com
 * Uses Google People API (contacts.readonly scope) to fetch profile photo URLs.
 * Returns: { photos: { [email]: url | null } }
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json({ error: true, message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const emailsParam = searchParams.get("emails") || "";
    const emails = emailsParam
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, 20); // safety limit

    if (emails.length === 0) {
      return NextResponse.json({ photos: {} });
    }

    // Parallel lookup — People API searchContacts per email
    const lookupResults = await Promise.allSettled(
      emails.map(async (email) => {
        const url =
          `${PEOPLE_API_BASE}/people:searchContacts` +
          `?query=${encodeURIComponent(email)}` +
          `&readMask=photos,emailAddresses` +
          `&pageSize=5`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) return { email, photoUrl: null };

        const data = await res.json();
        const results: Array<{ person?: { photos?: Array<{ url: string }>; emailAddresses?: Array<{ value: string }> } }> =
          data.results || [];

        // Prefer a contact whose emailAddresses includes an exact match
        const exactMatch = results.find((r) =>
          r.person?.emailAddresses?.some(
            (ea) => ea.value?.toLowerCase() === email.toLowerCase()
          )
        );
        const candidate = exactMatch ?? results[0];
        const photoUrl = candidate?.person?.photos?.find((p) => p.url)?.url ?? null;

        return { email, photoUrl };
      })
    );

    const photos: Record<string, string | null> = {};
    for (const result of lookupResults) {
      if (result.status === "fulfilled" && result.value) {
        photos[result.value.email] = result.value.photoUrl;
      }
    }

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("People API error:", error);
    // Non-fatal — carousel degrades to initials avatars
    return NextResponse.json(
      { error: true, message: error instanceof Error ? error.message : "People API failed" },
      { status: 500 }
    );
  }
}
