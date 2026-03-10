import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { GoogleGenAI } from "@google/genai";
import { getValidAccessToken, calendarRequest } from "@/lib/google-calendar";
import { convertToWav } from "@/lib/audio-utils";

const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";
const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const DEFAULT_USER_ID = "default-user";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
  name: "groq",
});

// ─── Types ─────────────────────────────────────────────────────────────────

interface WeatherData {
  location: string;
  temperature: number;
  temperatureUnit: string;
  apparentTemperature: number;
  weatherDescription: string;
  humidity: number;
  windSpeed: number;
  windSpeedUnit: string;
}

interface EmailSummary {
  unreadCount: number;
  importantSubjects: string[];
}

interface CalendarEvent {
  title: string;
  startTime: string;
  endTime?: string;
}

interface TaskItem {
  title: string;
  due?: string;
}

const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

// ─── Phase A: Data Gathering ────────────────────────────────────────────────

async function fetchWeather(location: string): Promise<WeatherData | null> {
  try {
    const geocodeRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    if (!geocodeRes.ok) return null;
    const geocodeData = await geocodeRes.json();
    if (!geocodeData.results?.length) return null;

    const { latitude, longitude, name, country, admin1 } = geocodeData.results[0];
    const displayLocation = [name, admin1, country].filter(Boolean).join(", ");

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    );
    if (!weatherRes.ok) return null;
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    return {
      location: displayLocation,
      temperature: current.temperature_2m,
      temperatureUnit: weatherData.current_units.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      weatherDescription: weatherCodeDescriptions[current.weather_code as number] ?? "Unknown",
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windSpeedUnit: weatherData.current_units.wind_speed_10m,
    };
  } catch {
    return null;
  }
}

async function fetchEmailSummary(accessToken: string): Promise<EmailSummary> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;

  let unreadCount = 0;
  const importantSubjects: string[] = [];

  try {
    // Get unread count from today
    const countRes = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=50&q=${encodeURIComponent(`is:unread is:inbox after:${dateStr}`)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (countRes.ok) {
      const countData = await countRes.json();
      unreadCount = (countData.messages as unknown[] | undefined)?.length ?? 0;
    }

    // Get important/starred emails for subject extraction
    const importantRes = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=5&q=${encodeURIComponent("is:important is:unread")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (importantRes.ok) {
      const importantData = await importantRes.json();
      const messages: Array<{ id: string }> = importantData.messages ?? [];

      // Fetch subject headers in parallel (max 5)
      const subjectFetches = messages.slice(0, 5).map((msg) =>
        fetch(`${GMAIL_API_BASE}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(async (r) => {
          if (!r.ok) return null;
          const d = await r.json();
          const subjectHeader = (d.payload?.headers as Array<{ name: string; value: string }> | undefined)?.find(
            (h) => h.name === "Subject"
          );
          return subjectHeader?.value ?? null;
        }).catch(() => null)
      );

      const subjects = await Promise.all(subjectFetches);
      importantSubjects.push(...subjects.filter((s): s is string => s !== null));
    }
  } catch {
    // Return whatever we have
  }

  return { unreadCount, importantSubjects };
}

async function fetchTodayCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      orderBy: "startTime",
      singleEvents: "true",
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      maxResults: "10",
      fields: "items(id,summary,start,end)",
    });

    const result = await calendarRequest<{
      items?: Array<{
        id: string;
        summary?: string;
        start: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    }>(accessToken, `/calendars/primary/events?${params}`);

    if (!result.success || !result.data?.items) return [];

    return result.data.items
      .filter((item) => !!item.start?.dateTime)
      .map((item) => ({
        title: item.summary ?? "Untitled event",
        startTime: new Date(item.start.dateTime!).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        endTime: item.end?.dateTime
          ? new Date(item.end.dateTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : undefined,
      }));
  } catch {
    return [];
  }
}

async function fetchTodayTasks(accessToken: string): Promise<TaskItem[]> {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get task lists first
    const listsRes = await fetch(`${TASKS_API_BASE}/users/@me/lists?maxResults=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listsRes.ok) return [];

    const listsData = await listsRes.json();
    const lists: Array<{ id: string }> = listsData.items ?? [];
    if (!lists.length) return [];

    // Fetch tasks from the first/default list that are due today
    const tasksRes = await fetch(
      `${TASKS_API_BASE}/lists/${lists[0]!.id}/tasks?showCompleted=false&dueMin=${today.toISOString()}&dueMax=${tomorrow.toISOString()}&maxResults=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!tasksRes.ok) return [];

    const tasksData = await tasksRes.json();
    const tasks: Array<{ title?: string; due?: string }> = tasksData.items ?? [];

    return tasks
      .filter((t) => t.title)
      .map((t) => ({
        title: t.title!,
        due: t.due ? todayStr : undefined,
      }));
  } catch {
    return [];
  }
}

// ─── Phase B1: News Fetching (Gemini + google_search) ───────────────────────

async function fetchTodayNews(dateString: string): Promise<string> {
  try {
    const result = await generateText({
      model: google("gemini-3.1-flash-lite-preview"),
      prompt: `Search the web and find 2-3 relevant, interesting news headlines for today (${dateString}). Return only a brief plain-text list of headlines with one-sentence summaries. No markdown, no bullet symbols.`,
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      toolChoice: "auto",
      stopWhen: stepCountIs(2),
      maxOutputTokens: 512,
    });
    return result.text.trim() || "No news headlines available.";
  } catch {
    return "No news headlines available.";
  }
}

// ─── Phase B2: Script Generation (Kimi K2 via Groq) ─────────────────────────

async function generateOverviewScript(
  weather: WeatherData | null,
  emails: EmailSummary,
  events: CalendarEvent[],
  tasks: TaskItem[],
  userLocation: string,
): Promise<string> {
  const now = new Date();
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const weatherSection = weather
    ? `Current weather in ${weather.location}: ${weather.weatherDescription}, ${weather.temperature}${weather.temperatureUnit} (feels like ${weather.apparentTemperature}${weather.temperatureUnit}), humidity ${weather.humidity}%, wind ${weather.windSpeed} ${weather.windSpeedUnit}.`
    : `Weather data unavailable for ${userLocation}.`;

  const emailSection =
    emails.unreadCount === 0
      ? "No unread emails today."
      : `You have ${emails.unreadCount} unread email${emails.unreadCount === 1 ? "" : "s"} today.${emails.importantSubjects.length > 0 ? ` Important ones include: ${emails.importantSubjects.slice(0, 3).join("; ")}.` : ""}`;

  const calendarSection =
    events.length === 0
      ? "No upcoming meetings scheduled today."
      : `Upcoming meetings: ${events
          .map((e) => `${e.title} at ${e.startTime}${e.endTime ? ` until ${e.endTime}` : ""}`)
          .join("; ")}.`;

  const tasksSection =
    tasks.length === 0
      ? "No tasks due today."
      : `Tasks due today: ${tasks.map((t) => t.title).join("; ")}.`;

  // Fetch news via Gemini (uses google_search, minimal quota)
  const newsSection = await fetchTodayNews(dateString);

  const systemPrompt = `You are a warm, friendly AI assistant creating a personalized audio morning briefing.
Write a natural, conversational script that flows well when read aloud.
Use a warm, professional tone — like a helpful personal assistant.
Keep it concise (aim for about 30-45 seconds when read aloud).
Do NOT use bullet points, markdown, asterisks, or special characters — write in plain speech.
Start with a greeting, cover the personal data naturally, then weave in the news highlights.
End with a brief, encouraging sign-off.`;

  const userPrompt = `Here is today's data for the briefing:

Date and time: ${dateString}, ${timeString}
Location: ${userLocation}

WEATHER: ${weatherSection}

EMAIL: ${emailSection}

CALENDAR: ${calendarSection}

TASKS: ${tasksSection}

NEWS HEADLINES: ${newsSection}

Please write the morning overview script using all the above data.`;

  const result = await generateText({
    model: groq("moonshotai/kimi-k2-instruct-0905"),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 1024,
  });

  return result.text;
}

// ─── Phase C: TTS Audio Generation ──────────────────────────────────────────

async function generateTTSAudio(script: string): Promise<{ audioBase64: string; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash-preview-tts",
    config: {
      temperature: 1,
      responseModalities: ["audio"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Zephyr" },
        },
      },
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Read aloud in a warm, welcoming, conversational tone, as if you're a friendly personal assistant:\n\n${script}`,
          },
        ],
      },
    ],
  });

  const audioChunks: Buffer[] = [];
  let mimeType = "audio/L16;rate=24000";

  for await (const chunk of response) {
    const part = chunk.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
      mimeType = part.inlineData.mimeType ?? mimeType;
      audioChunks.push(Buffer.from(part.inlineData.data, "base64"));
    }
  }

  if (!audioChunks.length) {
    throw new Error("TTS generation returned no audio data");
  }

  // Check if the output already has a WAV header; if not, wrap it
  const rawAudio = Buffer.concat(audioChunks);
  let finalAudio: Buffer;

  if (rawAudio.length >= 4 && rawAudio.toString("ascii", 0, 4) === "RIFF") {
    // Already a valid WAV file
    finalAudio = rawAudio;
  } else {
    // Wrap raw PCM data in a WAV container
    finalAudio = convertToWav(rawAudio.toString("base64"), mimeType);
  }

  return {
    audioBase64: finalAudio.toString("base64"),
    mimeType: "audio/wav",
  };
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const location: string = (body.location as string | undefined)?.trim() || "New York";

    // Get access token for Google services
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);

    // Phase A: Gather all data in parallel
    const [weather, emails, events, tasks] = await Promise.all([
      fetchWeather(location),
      accessToken ? fetchEmailSummary(accessToken) : Promise.resolve({ unreadCount: 0, importantSubjects: [] }),
      accessToken ? fetchTodayCalendarEvents(accessToken) : Promise.resolve([]),
      accessToken ? fetchTodayTasks(accessToken) : Promise.resolve([]),
    ]);

    // Phase B: Generate briefing script
    const script = await generateOverviewScript(weather, emails, events, tasks, location);

    // Phase C: Convert script to speech
    const { audioBase64, mimeType } = await generateTTSAudio(script);

    return NextResponse.json({
      audio: audioBase64,
      mimeType,
      script,
    });
  } catch (error) {
    console.error("[voice/overview] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate voice overview" },
      { status: 500 }
    );
  }
}
