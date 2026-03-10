import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Paperclip, Check, Send, X, CalendarPlus, ListChecks } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Shimmer } from "@/components/ai-elements/shimmer";

export interface EmailActionItem {
  text: string;
  dueLabel?: string;
}

export interface EmailTodoItem {
  title: string;
  notes?: string;
  due?: string;
  priority?: "high" | "medium" | "low";
}

export interface EmailCalendarEvent {
  title: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
  description?: string;
}

/** Category color palette — matches /api/gmail/categorize output */
const CATEGORY_STYLES: Record<string, { bg: string; border: string }> = {
  work: { bg: "rgba(80,160,221,0.55)", border: "rgba(80,160,221,0.3)" },
  personal: { bg: "rgba(100,200,130,0.55)", border: "rgba(100,200,130,0.3)" },
  marketing: { bg: "rgba(228,167,157,0.55)", border: "rgba(228,167,157,0.3)" },
  finance: { bg: "rgba(220,190,80,0.55)", border: "rgba(220,190,80,0.3)" },
  social: { bg: "rgba(180,130,220,0.55)", border: "rgba(180,130,220,0.3)" },
  newsletter: { bg: "rgba(160,170,180,0.55)", border: "rgba(160,170,180,0.3)" },
  updates: { bg: "rgba(100,200,200,0.55)", border: "rgba(100,200,200,0.3)" },
};

/** Format a date string to relative time (e.g. "2h ago", "3d ago") */
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

export interface EmailCardProps {
  /** Sender display name */
  senderName: string;
  /** Sender email address */
  senderEmail: string;
  /** Email subject */
  subject: string;
  /** Email body snippet */
  bodySnippet: string;
  /** AI-categorized labels (e.g. ["work", "marketing"]) */
  categories?: string[];
  /** Date string for relative time display */
  date?: string;
  /** Whether the email has file attachments */
  hasAttachments?: boolean;
  /** Number of file attachments */
  attachmentCount?: number;
  /** Gmail message ID */
  messageId?: string;
  /** Gmail thread ID */
  threadId?: string;
  /** Whether the email is unread */
  isUnread?: boolean;
  /** Importance/Priority */
  importance?: "high" | "medium" | "low";
  /** AI-generated short title */
  shortTitle?: string;
  /** AI-generated summary */
  summary?: string;
  /** AI-generated suggested reply */
  suggestedReply?: string;
  /** AI-derived action items */
  actionItems?: EmailActionItem[];
  /** AI-derived to-do items */
  todoItems?: EmailTodoItem[];
  /** AI-derived calendar event */
  calendarEvent?: EmailCalendarEvent | null;
  /** Sender profile picture URL */
  senderProfileUrl?: string;
  /** Callback when reply button is clicked */
  onReply?: (email: { subject: string; senderEmail: string; threadId?: string }) => void;
  /** Callback when mark-as-read button is clicked — removes card from list */
  onMarkRead?: (messageId: string) => Promise<void>;
  /** Create a to-do item from this email */
  onCreateTodo?: (item: EmailTodoItem) => Promise<void>;
  /** Create a calendar event from this email */
  onCreateCalendarEvent?: (event: EmailCalendarEvent) => Promise<void>;
  /** Callback when card body is clicked (for expand) */
  onCardClick?: () => void;
}

export function EmailCard({
  senderName,
  senderEmail,
  subject,
  bodySnippet,
  categories = [],
  date,
  hasAttachments = false,
  attachmentCount = 0,
  messageId,
  threadId,
  isUnread = false,
  importance,
  shortTitle,
  summary,
  suggestedReply,
  actionItems = [],
  todoItems = [],
  calendarEvent,
  senderProfileUrl,
  onReply,
  onMarkRead,
  onCreateTodo,
  onCreateCalendarEvent,
  onCardClick,
}: EmailCardProps) {
  const [markingRead, setMarkingRead] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyAnimation, setShowReplyAnimation] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [todoState, setTodoState] = useState<"idle" | "loading" | "done">("idle");
  const [calendarState, setCalendarState] = useState<"idle" | "loading" | "done">("idle");
  const replyAnimationTimeoutRef = useRef<number | null>(null);

  const diceBearUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(senderEmail)}`;
  const gravatarUrl = senderProfileUrl || diceBearUrl;
  const relativeTime = date ? formatRelativeTime(date) : "";

  const displayTitle = shortTitle || subject;
  const displayBody = summary || bodySnippet;
  const primaryTodoItem = todoItems[0];

  useEffect(() => {
    return () => {
      if (replyAnimationTimeoutRef.current !== null) {
        window.clearTimeout(replyAnimationTimeoutRef.current);
      }
    };
  }, []);

  const revealSuggestedReply = (nextReply: string) => {
    if (replyAnimationTimeoutRef.current !== null) {
      window.clearTimeout(replyAnimationTimeoutRef.current);
    }

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
    }, 1400);
  };

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!messageId || markingRead) return;
    setMarkingRead(true);
    try {
      await onMarkRead?.(messageId);
    } catch {
      setMarkingRead(false);
    }
  };

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReply(true);
    revealSuggestedReply(
      suggestedReply === "No reply needed." ? "" : (suggestedReply || "")
    );
    setSent(false);
  };

  const handleAddTodo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryTodoItem || !onCreateTodo || todoState !== "idle") return;
    setTodoState("loading");
    try {
      await onCreateTodo(primaryTodoItem);
      setTodoState("done");
    } catch {
      setTodoState("idle");
    }
  };

  const handleAddCalendar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!calendarEvent || !onCreateCalendarEvent || calendarState !== "idle") return;
    setCalendarState("loading");
    try {
      await onCreateCalendarEvent(calendarEvent);
      setCalendarState("done");
    } catch {
      setCalendarState("idle");
    }
  };

  const handleSendReply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/gmail/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: senderEmail,
          subject: `Re: ${subject}`,
          body: replyText,
          thread_id: threadId,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setSent(true);
        setTimeout(() => {
          setShowReply(false);
          setSent(false);
        }, 1500);
      }
    } finally {
      setSending(false);
    }
  };

  const handleCancelReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (replyAnimationTimeoutRef.current !== null) {
      window.clearTimeout(replyAnimationTimeoutRef.current);
      replyAnimationTimeoutRef.current = null;
    }
    setShowReply(false);
    setReplyText("");
    setShowReplyAnimation(false);
    setSent(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={(e) => { e.stopPropagation(); onCardClick?.(); }}
      className="relative flex flex-col w-full min-w-[450px] max-w-[506px] h-80 bg-white/15 backdrop-blur-2xl border border-white/40 rounded-[32px] p-5 shrink-0 select-none cursor-pointer"
      style={{
        fontFamily: 'var(--font-rubik), Rubik, sans-serif',
        boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -1px 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10)",
      }}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <div className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}

      {/* Email Title */}
      <h2 className="font-['Rubik'] text-[24px] text-black tracking-[-0.23px] leading-[1.2] mb-1.5 px-2 line-clamp-1">
        {displayTitle}
      </h2>

      {/* Date + Category pills — same row, below title */}
      <div className="flex items-center gap-2 px-2 mb-3 flex-wrap min-h-[22px]">
        {relativeTime && (
          <span className="font-['Rubik'] text-[11px] text-black/50 shrink-0">{relativeTime}</span>
        )}
        {relativeTime && categories.length > 0 && (
          <span className="text-black/25 text-[10px] select-none">·</span>
        )}
        {categories.map((cat) => {
          const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.updates;
          return (
            <div
              key={cat}
              className="px-3 py-0.5 rounded-full flex items-center justify-center relative overflow-hidden shrink-0"
              style={{
                background: `linear-gradient(135deg, ${style.bg} 0%, ${style.bg.replace("0.55", "0.35")} 50%, ${style.bg.replace("0.55", "0.45")} 100%)`,
                backdropFilter: "blur(16px) saturate(200%)",
                WebkitBackdropFilter: "blur(16px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: `inset 0 1px 2px rgba(255,255,255,0.75), inset 0 -1px 1px ${style.border}, 0 2px 8px ${style.border}`,
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 60%)" }}
              />
              <span className="font-['Rubik'] text-[10px] font-medium text-black/80 relative z-10">
                {cat}
              </span>
            </div>
          );
        })}
        {importance && (
          <div className={`px-3 py-0.5 rounded-full flex items-center justify-center shrink-0 ${importance === "high" ? "bg-red-400/30 border border-red-400/40" : "bg-amber-400/25 border border-amber-400/35"}`}>
            <span className="font-['Rubik'] text-[10px] font-medium text-black/70 capitalize">{importance} priority</span>
          </div>
        )}
      </div>

      {/* Main Content Area (White Box) — flex-grow to fill uniform height */}
      <div className="bg-white/80 rounded-4xl p-4 mb-4 flex-1 flex flex-col overflow-hidden">
        {/* Content: either reply UI or snippet */}
        <AnimatePresence mode="wait">
          {showReply ? (
            <motion.div
              key="reply"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex-1 flex flex-col gap-2 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cool AI animated background behind textarea */}
              <motion.div 
                className="absolute -inset-1 bg-linear-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl z-0"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                style={{ backgroundSize: "200% 200%" }}
              />
              {showReplyAnimation && replyText.trim() ? (
                <div className="flex-1 min-h-[112px] rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3 relative z-10 shadow-sm overflow-hidden">
                  <Shimmer
                    className="whitespace-pre-wrap font-['Rubik'] text-[13px] leading-5 tracking-[-0.23px]"
                    duration={2.2}
                    spread={1.15}
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
                  }}
                  className="flex-1 resize-none rounded-2xl bg-white/80 backdrop-blur-md border border-black/10 p-3 font-['Rubik'] text-[13px] text-black leading-5 tracking-[-0.23px] focus:outline-none focus:border-blue-400/50 placeholder:text-black/30 relative z-10 shadow-sm"
                  placeholder="Type your reply..."
                />
              )}
              <div className="flex items-center gap-2 justify-end relative z-10">
                <button
                  onClick={handleCancelReply}
                  className="flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors h-7 px-3 rounded-full"
                >
                  <X className="w-3 h-3 text-black/60 mr-1" />
                  <span className="font-['Rubik'] text-black/60 text-[11px]">Cancel</span>
                </button>
                {sent ? (
                  <div className="flex items-center justify-center bg-green-500/20 h-7 px-4 rounded-full">
                    <Check className="w-3 h-3 text-green-700 mr-1" />
                    <span className="font-['Rubik'] text-green-700 text-[11px]">Sent</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center justify-center bg-blue-500/80 hover:bg-blue-500/90 transition-colors h-7 px-4 rounded-full disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 text-white mr-1" />
                    <span className="font-['Rubik'] text-white text-[11px]">
                      {sending ? "Sending..." : "Send"}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="snippet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-['Rubik'] text-[14px] text-black leading-[1.6] tracking-[-0.23px] overflow-hidden line-clamp-3 [&_p]:inline [&_p]:m-0"
            >
              <ReactMarkdown>{displayBody}</ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="w-[calc(100%+40px)] -ml-5 border-b border-black/10 mb-4" />

      {/* Bottom Header Section */}
      <div className="flex items-center justify-between w-full relative z-10 px-1">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-white">
            <img
              src={avatarError ? diceBearUrl : gravatarUrl}
              alt={senderName}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          </div>
          <div className="flex flex-col -gap-1">
            <span className="font-['Rubik'] text-black text-[18px] tracking-[-0.23px] leading-tight">
              {senderName}
            </span>
            <span className="font-['Rubik'] text-black/80 text-[10px] tracking-[-0.115px]">
              {senderEmail}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Attachment indicator */}
          {hasAttachments && attachmentCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/5">
              <Paperclip className="w-3.5 h-3.5 text-black/60" strokeWidth={2} />
              <span className="font-['Rubik'] text-[10px] text-black/60">{attachmentCount}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {primaryTodoItem && onCreateTodo && (
              <button
                onClick={handleAddTodo}
                disabled={todoState !== "idle"}
                className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-3 rounded-[15px] disabled:opacity-55"
                title={todoItems.length > 1 ? `Add to To-Do (${todoItems.length})` : "Add to To-Do"}
              >
                {todoState === "done" ? <Check className="w-3.5 h-3.5 text-black/80" /> : <ListChecks className="w-3.5 h-3.5 text-black/80" />}
              </button>
            )}
            {calendarEvent && onCreateCalendarEvent && (
              <button
                onClick={handleAddCalendar}
                disabled={calendarState !== "idle"}
                className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-3 rounded-[15px] disabled:opacity-55"
                title="Add to Calendar"
              >
                {calendarState === "done" ? <Check className="w-3.5 h-3.5 text-black/80" /> : <CalendarPlus className="w-3.5 h-3.5 text-black/80" />}
              </button>
            )}
            <button
              onClick={handleReplyClick}
              className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px]"
            >
              <span className="font-['Rubik'] text-black text-[11px] leading-none">reply</span>
            </button>
            <motion.button
              onClick={handleMarkRead}
              disabled={markingRead}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-4 rounded-[15px] disabled:opacity-50"
            >
              <span className="font-['Rubik'] text-black text-[11px] leading-none">
                {markingRead ? "..." : "Mark as read"}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
