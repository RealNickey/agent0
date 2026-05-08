import React, { useRef, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { animate, motion, AnimatePresence } from "motion/react";
import { Streamdown } from "streamdown";
import { EmailCard, type EmailActionItem, type EmailCalendarEvent, type EmailTodoItem } from "./email-card";
import { Shimmer } from "./ai-elements/shimmer";
import { Mail, X, Send, Check, Sparkles, RefreshCw, CalendarPlus, ListChecks } from "lucide-react";

/** Shape returned by /api/gmail/messages */
interface GmailMessageResponse {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  labelIds: string[];
  hasAttachments: boolean;
  attachmentCount: number;
  isUnread: boolean;
}

/** AI summarization result for a single email */
interface SummarizedEmail {
  index: number;
  importance: "high" | "medium" | "low";
  shortTitle: string;
  summary: string;
  suggestedReply: string;
  actionItems: EmailActionItem[];
  todoItems: EmailTodoItem[];
  calendarEvent: EmailCalendarEvent | null;
}

/** Merged email data (message + category + AI summary) */
interface EnrichedEmail extends GmailMessageResponse {
  categories: string[];
  shortTitle?: string;
  summary?: string;
  suggestedReply?: string;
  importance?: "high" | "medium" | "low";
  actionItems?: EmailActionItem[];
  todoItems?: EmailTodoItem[];
  calendarEvent?: EmailCalendarEvent | null;
  photoUrl?: string | null;
}

// ─── LocalStorage cache (model-keyed) ────────────────────────────────────────────────────
const EMAIL_CACHE_ENABLED = false;

function getCacheKey(modelId: string) {
  return `gmail-enriched-emails-v6-${modelId.replace(/[^a-z0-9]/gi, "-")}`;
}

function buildEmailReference(email: EnrichedEmail) {
  return `From email: "${email.shortTitle || email.subject}" by ${email.fromName}`;
}

function getTodoKey(item: EmailTodoItem) {
  return `${item.title}::${item.due || "none"}`;
}

function formatDateOrDateTime(value?: string) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadCache(modelId: string): EmailCache | null {
  if (!EMAIL_CACHE_ENABLED || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(getCacheKey(modelId));
    if (!raw) return null;
    const cache: EmailCache = JSON.parse(raw);
    return cache;
  } catch {
    return null;
  }
}

function saveCache(emails: EnrichedEmail[], messageIds: string[], modelId: string) {
  if (!EMAIL_CACHE_ENABLED || typeof window === "undefined") return;
  try {
    const cache: EmailCache = { emails, timestamp: Date.now(), messageIds };
    localStorage.setItem(getCacheKey(modelId), JSON.stringify(cache));
  } catch {
    // quota exceeded
  }
}

function updateCacheAfterMarkRead(messageId: string, modelId: string) {
  if (!EMAIL_CACHE_ENABLED || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(getCacheKey(modelId));
    if (!raw) return;
    const cache: EmailCache = JSON.parse(raw);
    cache.emails = cache.emails.filter((e) => e.id !== messageId);
    cache.messageIds = cache.messageIds.filter((id) => id !== messageId);
    localStorage.setItem(getCacheKey(modelId), JSON.stringify(cache));
  } catch {
    // ignore
  }
}

interface EmailCache {
  emails: EnrichedEmail[];
  timestamp: number;
  messageIds: string[];
}

function clearCache(modelId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getCacheKey(modelId));
  } catch {
    // ignore
  }
}

interface EmailCardCarouselProps {
  isGmailConnected?: boolean;
  /** The currently selected model ID from the model selector */
  selectedModel?: string;
  onReply?: (email: { subject: string; senderEmail: string; threadId?: string }) => void;
  onExpandChange?: (expandedId: string | null) => void;
}

export function EmailCardCarousel({ isGmailConnected = false, selectedModel = "groq:openai/gpt-oss-20b", onReply, onExpandChange }: EmailCardCarouselProps) {
  const [emails, setEmails] = useState<EnrichedEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragMoved = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const motionStop = useRef<(() => void) | null>(null);
  const wheelTargetRef = useRef<number | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const wheelSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expandedEmail = expandedEmailId ? emails.find((e) => e.id === expandedEmailId) : null;

  useEffect(() => {
    if (!EMAIL_CACHE_ENABLED) {
      clearCache(selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    return () => {
      if (motionStop.current) {
        motionStop.current();
        motionStop.current = null;
      }
      if (wheelRafRef.current !== null) {
        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = null;
      }
      if (wheelSnapTimeoutRef.current !== null) {
        clearTimeout(wheelSnapTimeoutRef.current);
        wheelSnapTimeoutRef.current = null;
      }
    };
  }, []);

  const createTodoFromEmail = useCallback(async (email: EnrichedEmail, item: EmailTodoItem) => {
    const res = await fetch("/api/tasks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        notes: item.notes || buildEmailReference(email),
        due: item.due,
        priority: item.priority,
      }),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.message || "Failed to create task");
    }
  }, []);

  const createCalendarEventFromEmail = useCallback(async (email: EnrichedEmail, event: EmailCalendarEvent) => {
    const res = await fetch("/api/calendar/create-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: event.title,
        description: event.description || buildEmailReference(email),
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        location: event.location,
        attendees: event.attendees,
      }),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.message || "Failed to create calendar event");
    }
  }, []);

  // SSR-safe portal mount
  useEffect(() => setIsMounted(true), []);

  // ─── Fetch emails on mount (with LocalStorage cache) ─────────────────────
  useEffect(() => {
    if (!isGmailConnected) return;
    let cancelled = false;

    async function fetchEmails() {
      // 1. Try cache first — keyed by model so different models don’t share summaries
      const cached = loadCache(selectedModel);
      if (cached && cached.emails.length > 0) {
        setEmails(cached.emails);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Fetch unread inbox messages from the past week
        const msgRes = await fetch("/api/gmail/messages?maxResults=20&q=is:unread%20is:inbox%20newer_than:7d");
        const msgData = await msgRes.json();

        if (msgData.error || !msgData.messages) {
          setError(msgData.message || "Failed to load emails");
          return;
        }

        const messages: GmailMessageResponse[] = msgData.messages;
        if (messages.length === 0) {
          setEmails([]);
          return;
        }

        // Step 2: AI-categorize AND AI-summarize in parallel
        const [catResult, sumResult] = await Promise.allSettled([
          fetch("/api/gmail/categorize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: messages.map((m) => ({
                subject: m.subject,
                snippet: m.snippet,
                from: m.fromName || m.fromEmail,
              })),
              model: selectedModel,
            }),
          }).then((r) => r.json()),
          fetch("/api/gmail/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: messages.map((m) => ({
                subject: m.subject,
                snippet: m.snippet,
                from: m.fromName || m.fromEmail,
                to: m.to,
              })),
              model: selectedModel,
            }),
          }).then((r) => r.json()),
        ]);

        if (cancelled) return;

        const categories: { index: number; category: string }[] =
          catResult.status === "fulfilled" && !catResult.value.error
            ? catResult.value.categories || []
            : [];

        const summaries: SummarizedEmail[] =
          sumResult.status === "fulfilled" && !sumResult.value.error
            ? sumResult.value.emails || []
            : [];

        // Merge categories + summaries into messages
        const enriched: EnrichedEmail[] = messages.map((msg, i) => {
          const cats = categories.filter((c) => c.index === i).map((c) => c.category);
          const sum = summaries.find((s) => s.index === i);
          return {
            ...msg,
            categories: cats,
            shortTitle: sum?.shortTitle,
            summary: sum?.summary,
            suggestedReply: sum?.suggestedReply,
            importance: sum?.importance,
            actionItems: sum?.actionItems || [],
            todoItems: sum?.todoItems || [],
            calendarEvent: sum?.calendarEvent || null,
          };
        });

        // Keep all unread inbox messages (including low importance), sorted by importance then date.
        const importanceOrder = { high: 0, medium: 1, low: 2 };
        const filtered = enriched
          .sort((a, b) => {
            const ia = importanceOrder[a.importance || "low"];
            const ib = importanceOrder[b.importance || "low"];
            if (ia !== ib) return ia - ib;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          })
          .slice(0, 20);

        // Step 3: Fetch profile pictures from Google People API (best-effort)
        const uniqueEmails = [...new Set(filtered.map((e) => e.fromEmail).filter(Boolean))];
        let photoMap: Record<string, string | null> = {};
        try {
          const photoRes = await fetch(`/api/gmail/people?emails=${encodeURIComponent(uniqueEmails.join(","))}`);
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            photoMap = photoData.photos || {};
          }
        } catch {
          // People API gracefully degraded — photos will fall back to initials
        }

        const filteredWithPhotos = filtered.map((e) => ({
          ...e,
          photoUrl: photoMap[e.fromEmail] ?? null,
        }));

        setEmails(filteredWithPhotos);
        saveCache(filteredWithPhotos, filteredWithPhotos.map((e) => e.id), selectedModel);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load emails");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchEmails();
    const intervalId = setInterval(fetchEmails, 60 * 60 * 1000); // refresh every hour

    return () => { 
      cancelled = true; 
      clearInterval(intervalId);
    };
  }, [isGmailConnected, selectedModel]);

  // ─── Mark as read handler — removes card after API call ────────────────────
  const handleMarkRead = useCallback(async (messageId: string) => {
    const res = await fetch("/api/gmail/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    const data = await res.json();
    if (!data.error) {
      // Close expanded view if this card was expanded
      if (expandedEmailId === messageId) {
        setExpandedEmailId(null);
        onExpandChange?.(null);
      }
      setEmails((prev) => prev.filter((e) => e.id !== messageId));
      updateCacheAfterMarkRead(messageId, selectedModel);
    } else {
      throw new Error(data.message || "Failed to mark as read");
    }
  }, [expandedEmailId, onExpandChange]);

  // ─── Expand / collapse handlers ───────────────────────────────────────────
  const handleCardClick = useCallback((emailId: string) => {
    if (dragMoved.current) return; // Don't expand if user was dragging
    setExpandedEmailId(emailId);
    onExpandChange?.(emailId);

    // Auto-scroll to center the clicked card after a short delay for layout changes
    setTimeout(() => {
      const container = scrollRef.current;
      const el = document.getElementById(`email-wrapper-${emailId}`);
      if (!container || !el) return;
      
      const targetScroll = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      
      if (motionStop.current) { motionStop.current(); motionStop.current = null; }
      const controls = animate(container.scrollLeft, targetScroll, {
        type: "spring",
        stiffness: 260,
        damping: 30,
        mass: 0.8,
        onUpdate: (v) => { if (scrollRef.current) scrollRef.current.scrollLeft = v; },
      });
      motionStop.current = () => controls.stop();
    }, 50);
  }, [onExpandChange]);

  const handleCloseExpanded = useCallback(() => {
    setExpandedEmailId(null);
    onExpandChange?.(null);
  }, [onExpandChange]);

  // Handle outside click to close
  useEffect(() => {
    if (!expandedEmailId) return;
    const handleClickOutside = (e: MouseEvent) => {
      // If clicked inside the carousel container, handle it there (or ignore if on a card)
      // We want to close if clicked completely outside the carousel too.
      if (scrollRef.current && !scrollRef.current.contains(e.target as Node)) {
        handleCloseExpanded();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandedEmailId, handleCloseExpanded]);

  // ─── Drag / scroll handlers ───────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;
    e.preventDefault();

    if (motionStop.current) {
      motionStop.current();
      motionStop.current = null;
    }

    const container = scrollRef.current;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const currentTarget = wheelTargetRef.current ?? container.scrollLeft;
    const nextTarget = Math.min(maxScroll, Math.max(0, currentTarget + delta * 1.2));
    wheelTargetRef.current = nextTarget;

    if (wheelRafRef.current === null) {
      const tick = () => {
        const node = scrollRef.current;
        const targetValue = wheelTargetRef.current;
        if (!node || targetValue === null) {
          wheelRafRef.current = null;
          return;
        }

        const diff = targetValue - node.scrollLeft;
        if (Math.abs(diff) < 0.5) {
          node.scrollLeft = targetValue;
          wheelRafRef.current = null;
          return;
        }

        node.scrollLeft += diff * 0.22;
        wheelRafRef.current = requestAnimationFrame(tick);
      };

      wheelRafRef.current = requestAnimationFrame(tick);
    }

    if (wheelSnapTimeoutRef.current !== null) {
      clearTimeout(wheelSnapTimeoutRef.current);
    }

    wheelSnapTimeoutRef.current = setTimeout(() => {
      const node = scrollRef.current;
      if (!node) return;
      const target = findSnapTarget(node, wheelTargetRef.current ?? node.scrollLeft);
      const controls = animate(node.scrollLeft, target, {
        type: "spring",
        stiffness: 220,
        damping: 34,
        mass: 0.95,
        onUpdate: (v) => {
          if (scrollRef.current) scrollRef.current.scrollLeft = v;
        },
      });
      motionStop.current = () => controls.stop();
      wheelTargetRef.current = null;
      wheelSnapTimeoutRef.current = null;
    }, 140);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    if (motionStop.current) { motionStop.current(); motionStop.current = null; }
    if (wheelRafRef.current !== null) {
      cancelAnimationFrame(wheelRafRef.current);
      wheelRafRef.current = null;
    }
    if (wheelSnapTimeoutRef.current !== null) {
      clearTimeout(wheelSnapTimeoutRef.current);
      wheelSnapTimeoutRef.current = null;
    }
    wheelTargetRef.current = null;
    isDraggingRef.current = true;
    dragMoved.current = false;
    setIsDragging(true);
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velocity.current = 0;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const instantVelocity = ((lastX.current - e.pageX) / dt) * 1000;
      velocity.current = velocity.current * 0.72 + instantVelocity * 0.28;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const dx = Math.abs(x - startX.current);
    if (dx > 5) dragMoved.current = true;
    scrollRef.current.scrollLeft = scrollLeftRef.current - (x - startX.current);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!scrollRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const container = scrollRef.current;
    const v = Math.max(-2200, Math.min(2200, velocity.current));
    const DECEL = 1800;
    const coasting = (v * Math.abs(v)) / (2 * DECEL);
    const projected = container.scrollLeft + coasting;
    const target = findSnapTarget(container, projected);

    const controls = animate(container.scrollLeft, target, {
      type: "spring",
      velocity: v,
      stiffness: 220,
      damping: 34,
      mass: 0.95,
      onUpdate: (latest) => { if (scrollRef.current) scrollRef.current.scrollLeft = latest; },
    });
    motionStop.current = () => controls.stop();
    velocity.current = 0;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) handleMouseUp();
  }, [handleMouseUp]);

  // ─── Not connected state ──────────────────────────────────────────────────
  if (!isGmailConnected) {
    return (
      <div className="relative w-full pointer-events-auto my-4 select-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-10 px-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20"
          style={{ fontFamily: 'var(--font-rubik), Rubik, sans-serif' }}
        >
          <Mail className="w-8 h-8 text-white/40" />
          <p className="text-white/50 text-sm font-medium">Connect Gmail to see your inbox</p>
        </motion.div>
      </div>
    );
  }

  // ─── Loading state (skeleton cards) ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="relative w-full pointer-events-auto my-4 select-none"
      >
        <div className="flex gap-4 overflow-hidden pb-4 pt-4" style={{ paddingLeft: "calc(50% - 253px)", paddingRight: "calc(50% - 253px)" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="shrink-0 w-[506px] h-80 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="relative w-full pointer-events-auto my-4 select-none flex justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2 py-8 px-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20"
          style={{ fontFamily: 'var(--font-rubik), Rubik, sans-serif' }}
        >
          <p className="text-white/50 text-sm">{error}</p>
        </motion.div>
      </div>
    );
  }

  // ─── Empty inbox state ──────────────────────────────────────────────────────
  if (emails.length === 0) {
    return (
      <div className="relative w-full pointer-events-auto my-4 select-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-10 px-6 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20"
          style={{ fontFamily: 'var(--font-rubik), Rubik, sans-serif' }}
        >
          <Mail className="w-8 h-8 text-white/40" />
          <p className="text-white/50 text-sm font-medium">Your inbox is empty</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Carousel */}
      <div
        className="relative w-full pointer-events-auto my-4 select-none"
        onClick={() => { if (expandedEmailId && !dragMoved.current) handleCloseExpanded(); }}
      >
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-4"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            cursor: isDragging ? "grabbing" : "grab",
            scrollSnapType: "none",
            WebkitOverflowScrolling: "touch",
            userSelect: "none",
            WebkitUserSelect: "none",
            paddingLeft: "calc(50% - 253px)",
            paddingRight: "calc(50% - 253px)",
          }}
        >
          <AnimatePresence mode="popLayout">
            {emails.map((email) => (
              <motion.div
                key={email.id}
                id={`email-wrapper-${email.id}`}
                layout
                layoutId={`email-container-${email.id}`}
                className="shrink-0 cursor-pointer"
                data-snap-card
              >
                {expandedEmailId === email.id ? (
                  <ExpandedEmailCard
                    email={email}
                    selectedModel={selectedModel}
                    onClose={handleCloseExpanded}
                    onMarkRead={handleMarkRead}
                    onCreateTodo={(item) => createTodoFromEmail(email, item)}
                    onCreateCalendarEvent={(event) => createCalendarEventFromEmail(email, event)}
                  />
                ) : (
                  <EmailCard
                    senderName={email.fromName}
                    senderEmail={email.fromEmail}
                    subject={email.subject}
                    bodySnippet={email.snippet}
                    categories={email.categories}
                    date={email.date}
                    hasAttachments={email.hasAttachments}
                    attachmentCount={email.attachmentCount}
                    messageId={email.id}
                    threadId={email.threadId}
                    isUnread={email.isUnread}
                    importance={email.importance}
                    shortTitle={email.shortTitle}
                    summary={email.summary}
                    suggestedReply={email.suggestedReply}
                    actionItems={email.actionItems}
                    todoItems={email.todoItems}
                    calendarEvent={email.calendarEvent}
                    onReply={onReply}
                    onMarkRead={handleMarkRead}
                    onCreateTodo={(item) => createTodoFromEmail(email, item)}
                    onCreateCalendarEvent={(event) => createCalendarEventFromEmail(email, event)}
                    onCardClick={() => handleCardClick(email.id)}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// ─── Expanded Email Card ──────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; border: string }> = {
  work: { bg: "rgba(80,160,221,0.55)", border: "rgba(80,160,221,0.3)" },
  personal: { bg: "rgba(100,200,130,0.55)", border: "rgba(100,200,130,0.3)" },
  marketing: { bg: "rgba(228,167,157,0.55)", border: "rgba(228,167,157,0.3)" },
  finance: { bg: "rgba(220,190,80,0.55)", border: "rgba(220,190,80,0.3)" },
  social: { bg: "rgba(180,130,220,0.55)", border: "rgba(180,130,220,0.3)" },
  newsletter: { bg: "rgba(160,170,180,0.55)", border: "rgba(160,170,180,0.3)" },
  updates: { bg: "rgba(100,200,200,0.55)", border: "rgba(100,200,200,0.3)" },
};

function ExpandedEmailCard({
  email,
  selectedModel,
  onClose,
  onMarkRead,
  onCreateTodo,
  onCreateCalendarEvent,
}: {
  email: EnrichedEmail;
  selectedModel: string;
  onClose: () => void;
  onMarkRead: (messageId: string) => Promise<void>;
  onCreateTodo: (item: EmailTodoItem) => Promise<void>;
  onCreateCalendarEvent: (event: EmailCalendarEvent) => Promise<void>;
}) {
  const [replyText, setReplyText] = useState("");
  const [replyVisible, setReplyVisible] = useState(false);
  const [showReplyAnimation, setShowReplyAnimation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [taskStates, setTaskStates] = useState<Record<string, "idle" | "loading" | "done">>({});
  const [calendarState, setCalendarState] = useState<"idle" | "loading" | "done">("idle");
  const replyAnimationTimeoutRef = useRef<number | null>(null);

  const relativeTime = email.date ? formatRelativeTime(email.date) : "";
  const actionItems = email.actionItems || [];
  const todoItems = email.todoItems || [];
  const calendarEvent = email.calendarEvent || null;

  // Initials + color for avatar fallback
  const initials = (email.fromName || email.fromEmail)
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const avatarBg = stringToHslColor(email.fromEmail);

  // Escape key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (replyAnimationTimeoutRef.current !== null) {
        window.clearTimeout(replyAnimationTimeoutRef.current);
      }
    };
  }, []);

  const revealReply = (nextReply: string) => {
    if (replyAnimationTimeoutRef.current !== null) {
      window.clearTimeout(replyAnimationTimeoutRef.current);
    }

    setReplyVisible(true);
    setReplyText(nextReply);

    if (!nextReply.trim()) {
      setShowReplyAnimation(false);
      replyAnimationTimeoutRef.current = null;
      return;
    }

    setShowReplyAnimation(true);
    replyAnimationTimeoutRef.current = window.setTimeout(() => {
      setShowReplyAnimation(false);
      replyAnimationTimeoutRef.current = null;
    }, 1600);
  };

  const handleGenerateReply = async () => {
    if (email.suggestedReply && email.suggestedReply !== "No reply needed." && !replyText) {
      revealReply(email.suggestedReply);
      return;
    }
    setReplyVisible(true);
    setGenerating(true);
    try {
      const res = await fetch("/api/gmail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: email.subject,
          snippet: email.snippet,
          from: email.fromName || email.fromEmail,
          to: email.to
        }),
      });
      const data = await res.json();
      if (!data.error && data.reply) {
        revealReply(data.reply);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/gmail/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.fromEmail,
          subject: `Re: ${email.subject}`,
          body: replyText,
          thread_id: email.threadId,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setReplyVisible(false);
          setReplyText("");
          setShowReplyAnimation(false);
        }, 2000);
      }
    } finally {
      setSending(false);
    }
  };

  const handleMarkRead = async () => {
    if (markingRead) return;
    setMarkingRead(true);
    try {
      await onMarkRead(email.id);
    } catch {
      setMarkingRead(false);
    }
  };

  const handleAddTask = async (actionText: string) => {
    const targetItem = todoItems.find((item) => getTodoKey(item) === actionText);
    if (!targetItem) return;
    setTaskStates((s) => ({ ...s, [actionText]: "loading" }));
    try {
      await onCreateTodo(targetItem);
      setTaskStates((s) => ({ ...s, [actionText]: "done" }));
    } catch {
      setTaskStates((s) => ({ ...s, [actionText]: "idle" }));
    }
  };

  const handleAddCalendar = async () => {
    if (!calendarEvent || calendarState !== "idle") return;
    setCalendarState("loading");
    try {
      await onCreateCalendarEvent(calendarEvent);
      setCalendarState("done");
    } catch {
      setCalendarState("idle");
    }
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.92, opacity: 0, y: 24 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.92, opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      onClick={(e) => e.stopPropagation()}
      className="relative flex flex-col w-[90vw] max-w-[700px] h-[550px] bg-white/22 backdrop-blur-3xl border border-white/40 rounded-[32px] overflow-hidden"
      style={{
        fontFamily: "var(--font-rubik), Rubik, sans-serif",
        boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.6), 0 24px 80px rgba(0,0,0,0.28)",
      }}
    >
      {/* Scrollable content */}
      <div
        className="overflow-y-auto p-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >

          {/* Close button */}
          <button
            type="button"
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/12 hover:bg-black/22 active:bg-black/32 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-black/70" />
          </button>

          {/* Sender row */}
          <div className="flex items-center gap-3 pr-12">
            <div
              className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: email.photoUrl ? undefined : avatarBg }}
            >
              {email.photoUrl
                ? <img src={email.photoUrl} alt={email.fromName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <span className="font-['Rubik'] text-white text-[16px] font-semibold select-none">{initials}</span>
              }
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-['Rubik'] text-black text-xl tracking-[-0.23px] leading-tight truncate">{email.fromName}</span>
              <span className="font-['Rubik'] text-black/55 text-xs tracking-[-0.1px] truncate">{email.fromEmail}</span>
            </div>
            {relativeTime && (
              <span className="ml-auto shrink-0 font-['Rubik'] text-[11px] text-black/40">{relativeTime}</span>
            )}
          </div>

          {/* Title */}
          <div>
            <h2 className="font-['Rubik'] text-[26px] text-black tracking-[-0.3px] leading-tight">
              {email.shortTitle || email.subject}
            </h2>
            {email.shortTitle && email.shortTitle !== email.subject && (
              <p className="font-['Rubik'] text-[12px] text-black/45 mt-0.5">{email.subject}</p>
            )}
          </div>

          {/* Category + importance pills */}
          {(email.categories.length > 0 || email.importance) && (
            <div className="flex items-center gap-2 flex-wrap">
              {email.categories.map((cat) => {
                const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.updates;
                return (
                  <div key={cat}
                    className="px-3 py-0.5 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${style.bg} 0%, ${style.bg.replace("0.55", "0.35")} 100%)`,
                      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                      border: "1px solid rgba(255,255,255,0.6)",
                      boxShadow: `inset 0 1px 2px rgba(255,255,255,0.75), 0 2px 8px ${style.border}`,
                    }}>
                    <span className="font-['Rubik'] text-[10px] font-medium text-black/80">{cat}</span>
                  </div>
                );
              })}
              {email.importance && (
                <div className={`px-3 py-0.5 rounded-full ${email.importance === "high" ? "bg-red-400/30 border border-red-400/40" : "bg-amber-400/25 border border-amber-400/35"}`}>
                  <span className="font-['Rubik'] text-[10px] font-medium text-black/70">{email.importance} priority</span>
                </div>
              )}
            </div>
          )}

          {/* AI Summary with Markdown */}
          <div className="bg-white/75 rounded-3xl px-5 py-4">
            <div
              className="[&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-black/55 [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:uppercase [&_h2]:tracking-wider [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-black/80 [&_h3]:mt-2 [&_h3]:mb-0.5 [&_strong]:font-semibold [&_strong]:text-black [&_p]:text-[14px] [&_p]:text-black [&_p]:leading-[1.65] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_li]:text-[13px] [&_li]:text-black/80 [&_li]:leading-5 [&_code]:bg-black/8 [&_code]:rounded [&_code]:px-1 [&_code]:text-[12px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Streamdown>
                {email.summary || email.snippet}
              </Streamdown>
            </div>

            {/* Action Items */}
            {actionItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/8">
                <p className="font-['Rubik'] text-[11px] font-semibold text-black/45 uppercase tracking-wider mb-2">Action Items</p>
                <div className="flex flex-col gap-1.5">
                  {actionItems.map((item) => {
                    return (
                      <div key={`${item.text}-${item.dueLabel || "none"}`} className="flex items-start gap-2">
                        <div className="w-3.5 h-3.5 mt-0.5 rounded border border-black/20 shrink-0 bg-white/60" />
                        <div className="flex-1">
                          <span className="font-['Rubik'] text-[13px] text-black/80 leading-5 block">{item.text}</span>
                          {item.dueLabel && (
                            <span className="font-['Rubik'] text-[11px] text-black/45">Due {item.dueLabel}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {todoItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/8">
                <p className="font-['Rubik'] text-[11px] font-semibold text-black/45 uppercase tracking-wider mb-2">To-Do Suggestions</p>
                <div className="flex flex-col gap-2">
                  {todoItems.map((item) => {
                    const key = getTodoKey(item);
                    const state = taskStates[key] || "idle";
                    return (
                      <div key={key} className="flex items-start gap-2 group">
                        <div className="w-3.5 h-3.5 mt-0.5 rounded border border-black/20 shrink-0 bg-white/60" />
                        <div className="flex-1 min-w-0">
                          <span className="font-['Rubik'] text-[13px] text-black/80 leading-5 block">{item.title}</span>
                          {(item.due || item.priority) && (
                            <span className="font-['Rubik'] text-[11px] text-black/45">
                              {[item.priority ? `${item.priority} priority` : null, formatDateOrDateTime(item.due)].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {item.notes && (
                            <p className="font-['Rubik'] text-[11px] text-black/55 mt-1 line-clamp-2">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Add to Tasks"
                            onClick={(e) => { e.stopPropagation(); handleAddTask(key); }}
                            disabled={state !== "idle"}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 hover:bg-green-500/28 transition-colors disabled:opacity-60 text-green-800"
                          >
                            {state === "loading" ? <RefreshCw className="w-3 h-3 animate-spin" /> : state === "done" ? <Check className="w-3 h-3" /> : <ListChecks className="w-3 h-3" />}
                            <span className="text-[10px] font-medium">{state === "done" ? "Added" : "Task"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {calendarEvent && (
              <div className="mt-3 pt-3 border-t border-black/8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-['Rubik'] text-[11px] font-semibold text-black/45 uppercase tracking-wider mb-2">Calendar Draft</p>
                    <p className="font-['Rubik'] text-[14px] text-black/85 leading-5">{calendarEvent.title}</p>
                    <p className="font-['Rubik'] text-[11px] text-black/45 mt-1">
                      {formatDateOrDateTime(calendarEvent.startDateTime)}
                      {calendarEvent.endDateTime ? ` to ${formatDateOrDateTime(calendarEvent.endDateTime)}` : ""}
                    </p>
                    {calendarEvent.location && (
                      <p className="font-['Rubik'] text-[11px] text-black/45 mt-1">{calendarEvent.location}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Add to Calendar"
                    onClick={(e) => { e.stopPropagation(); handleAddCalendar(); }}
                    disabled={calendarState !== "idle"}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/28 transition-colors disabled:opacity-60 text-blue-800 shrink-0"
                  >
                    {calendarState === "loading" ? <RefreshCw className="w-3 h-3 animate-spin" /> : calendarState === "done" ? <Check className="w-3 h-3" /> : <CalendarPlus className="w-3 h-3" />}
                    <span className="text-[10px] font-medium">{calendarState === "done" ? "Added" : "Calendar"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reply Section */}
          <div className="bg-white/55 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-['Rubik'] text-[12px] text-black/50 font-medium">Reply</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleGenerateReply(); }}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/10 hover:bg-black/20 active:bg-black/25 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-black/60" />
                <span className="font-['Rubik'] text-[11px] text-black/60">{replyText ? "Regenerate" : "AI Reply"}</span>
              </button>
            </div>

            <div className="relative">
              <AnimatePresence>
                {(generating || replyText || replyVisible) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1, backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute -inset-1 bg-linear-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl z-0 pointer-events-none"
                    style={{ backgroundSize: "200% 200%" }}
                    transition={{ 
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.2 },
                      backgroundPosition: { duration: 5, ease: "linear", repeat: Infinity }
                    }}
                  />
                )}
              </AnimatePresence>
              {generating ? (
                <div className="w-full min-h-[90px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3 relative z-10 shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-2.5 pt-1">
                    <Shimmer className="font-['Rubik'] text-[14px] leading-5" duration={1.8} spread={1.3}>
                      Drafting a reply that matches this message and thread context.
                    </Shimmer>
                    <Shimmer className="font-['Rubik'] text-[14px] leading-5 max-w-[92%]" duration={1.8} spread={1.25}>
                      Pulling out the intent, tone, and next step before filling the draft.
                    </Shimmer>
                    <Shimmer className="font-['Rubik'] text-[14px] leading-5 max-w-[72%]" duration={1.8} spread={1.2}>
                      Finalizing a polished response.
                    </Shimmer>
                  </div>
                </div>
              ) : showReplyAnimation && replyText.trim() ? (
                <div className="w-full min-h-[90px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3 relative z-10 shadow-sm overflow-hidden">
                  <Shimmer
                    className="whitespace-pre-wrap font-['Rubik'] text-[14px] leading-5"
                    duration={2.2}
                    spread={1.1}
                  >
                    {replyText}
                  </Shimmer>
                </div>
              ) : (
                <textarea
                  value={replyText}
                  onChange={(e) => {
                    setShowReplyAnimation(false);
                    setReplyText(e.target.value);
                    setReplyVisible(true);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full resize-none rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3 font-['Rubik'] text-[14px] text-black leading-5 focus:outline-none focus:border-blue-400/50 placeholder:text-black/30 min-h-[90px] relative z-10 shadow-sm"
                  placeholder="Type a reply or click AI Reply…"
                />
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleMarkRead(); }}
                disabled={markingRead}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-black/60" />
                <span className="font-['Rubik'] text-black/60 text-[12px]">{markingRead ? "Marking…" : "Mark as read"}</span>
              </button>

              <AnimatePresence mode="wait">
                {(replyVisible || replyText) && (
                  <motion.div
                    key={sent ? "reply-sent" : "reply-send"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    {sent ? (
                      <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-500/20">
                        <Check className="w-3.5 h-3.5 text-green-700" />
                        <span className="font-['Rubik'] text-green-700 text-[12px]">Sent!</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSendReply(); }}
                        disabled={sending || !replyText.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500/80 hover:bg-blue-500 transition-colors disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5 text-white" />
                        <span className="font-['Rubik'] text-white text-[12px]">{sending ? "Sending…" : "Send"}</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
    </motion.div>
  );
}

/** Deterministic HSL color from a string (for avatar background) */
function stringToHslColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 48%)`;
}

/** Format a date string to relative time */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/** Returns the scrollLeft that centres the card nearest to `projectedScrollLeft`. */
function findSnapTarget(container: HTMLDivElement, projectedScrollLeft: number): number {
  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-snap-card]"));
  if (!cards.length) return container.scrollLeft;
  const projectedCenter = projectedScrollLeft + container.clientWidth / 2;
  let closest = cards[0];
  let minDist = Infinity;
  for (const card of cards) {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - projectedCenter);
    if (dist < minDist) { minDist = dist; closest = card; }
  }
  return closest.offsetLeft + closest.offsetWidth / 2 - container.clientWidth / 2;
}
