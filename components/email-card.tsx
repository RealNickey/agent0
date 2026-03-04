"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Code, FileText, File, Paperclip, Reply, CheckCheck, Send, X, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailAttachment {
  filename: string;
  mimeType: string;
}

export interface EmailCardData {
  messageId: string;
  threadId: string;
  subject: string;
  summary: string;
  category: string;
  senderName: string;
  senderEmail: string;
  date: string;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
}

interface EmailCardProps {
  data?: EmailCardData;
  onDismiss?: () => void;
}

// ─── Category badge config ────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; label: string }> = {
  marketing: {
    bg: "linear-gradient(135deg, rgba(228,167,157,0.55) 0%, rgba(255,200,190,0.35) 50%, rgba(228,167,157,0.45) 100%)",
    label: "marketing",
  },
  work: {
    bg: "linear-gradient(135deg, rgba(80,160,221,0.55) 0%, rgba(140,200,255,0.35) 50%, rgba(80,160,221,0.45) 100%)",
    label: "work",
  },
  finance: {
    bg: "linear-gradient(135deg, rgba(120,220,140,0.55) 0%, rgba(180,255,190,0.35) 50%, rgba(120,220,140,0.45) 100%)",
    label: "finance",
  },
  meeting: {
    bg: "linear-gradient(135deg, rgba(200,160,240,0.55) 0%, rgba(230,200,255,0.35) 50%, rgba(200,160,240,0.45) 100%)",
    label: "meeting",
  },
  social: {
    bg: "linear-gradient(135deg, rgba(255,200,80,0.55) 0%, rgba(255,230,140,0.35) 50%, rgba(255,200,80,0.45) 100%)",
    label: "social",
  },
  notification: {
    bg: "linear-gradient(135deg, rgba(255,150,80,0.55) 0%, rgba(255,190,140,0.35) 50%, rgba(255,150,80,0.45) 100%)",
    label: "notification",
  },
  updates: {
    bg: "linear-gradient(135deg, rgba(80,210,200,0.55) 0%, rgba(140,240,230,0.35) 50%, rgba(80,210,200,0.45) 100%)",
    label: "updates",
  },
  forums: {
    bg: "linear-gradient(135deg, rgba(160,160,220,0.55) 0%, rgba(200,200,255,0.35) 50%, rgba(160,160,220,0.45) 100%)",
    label: "forums",
  },
  general: {
    bg: "linear-gradient(135deg, rgba(180,180,180,0.55) 0%, rgba(220,220,220,0.35) 50%, rgba(180,180,180,0.45) 100%)",
    label: "general",
  },
};

// ─── Attachment icon helpers ──────────────────────────────────────────────────

function attachmentIcon(mimeType: string) {
  if (mimeType.includes("pdf") || mimeType.includes("text")) {
    return { Icon: FileText, bg: "#0047FF", color: "text-white" };
  }
  if (mimeType.includes("image")) {
    return { Icon: File, bg: "#FF0000", color: "text-white" };
  }
  if (mimeType.includes("zip") || mimeType.includes("code") || mimeType.includes("json") || mimeType.includes("javascript")) {
    return { Icon: Code, bg: "#FFD700", color: "text-black" };
  }
  return { Icon: Paperclip, bg: "#888888", color: "text-white" };
}

// ─── Default / fallback email data ───────────────────────────────────────────

const PLACEHOLDER: EmailCardData = {
  messageId: "placeholder",
  threadId: "placeholder",
  subject: "Project not completed!",
  summary: "Honestly, Bro, I don't think you realize how much I'm carrying here, and seeing this still sitting at 80% is literally giving me a headache. I've already mapped out the entire workflow for you...",
  category: "work",
  senderName: "Aswin Jim",
  senderEmail: "aswinjimson@gmail.com",
  date: "Mar 3",
  hasAttachments: true,
  attachments: [
    { filename: "script.js", mimeType: "application/javascript" },
    { filename: "report.pdf", mimeType: "application/pdf" },
    { filename: "design.pdf", mimeType: "application/pdf" },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailCard({ data, onDismiss }: EmailCardProps) {
  const email = data || PLACEHOLDER;
  const categoryStyle = CATEGORY_STYLES[email.category] || CATEGORY_STYLES.general;

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState(
    () => `Hi ${email.senderName.split(" ")[0]},\n\nThank you for your email regarding "${email.subject}".\n\n`
  );
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);

  const handleMarkAsRead = () => {
    setDismissed(true);
    // Fire-and-forget API call if we have a real messageId
    if (email.messageId !== "placeholder") {
      fetch("/api/gmail/mark-as-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: email.messageId }),
      }).catch((err) => console.error("[EmailCard] mark-as-read failed:", err));
    }
    setTimeout(() => onDismiss?.(), 450);
  };

  const handleSendReply = async () => {
    if (!replyBody.trim()) return;
    if (email.messageId === "placeholder") {
      // Simulate send for placeholder/demo cards
      setSendStatus("sending");
      await new Promise((r) => setTimeout(r, 800));
      setSendStatus("sent");
      return;
    }
    setSendStatus("sending");
    try {
      const res = await fetch("/api/gmail/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.senderEmail,
          subject: `Re: ${email.subject}`,
          body: replyBody,
          thread_id: email.threadId,
        }),
      });
      const json = await res.json();
      setSendStatus(json.error ? "error" : "sent");
    } catch {
      setSendStatus("error");
    }
  };

  const attachmentsToShow = email.attachments?.slice(0, 3) || [];

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="email-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60, scale: 0.92 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="relative flex flex-col w-full min-w-[450px] max-w-[506px] bg-white/15 backdrop-blur-2xl border border-white/40 rounded-[32px] p-5 shrink-0 select-none"
          style={{
            fontFamily: "var(--font-rubik), Rubik, sans-serif",
            boxShadow:
              "inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -1px 1px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10)",
          }}
        >
          {/* Subject */}
          <h2 className="font-['Rubik'] text-[22px] text-black tracking-[-0.23px] leading-[1.2] mb-3 px-2 line-clamp-2">
            {email.subject}
          </h2>

          {/* Main Content Area */}
          <div className="bg-white/80 rounded-[20px] p-4 mb-4">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Category badge */}
              <div
                className="px-3 py-1 rounded-[10px] h-[22px] flex items-center justify-center relative overflow-hidden"
                style={{
                  background: categoryStyle.bg,
                  backdropFilter: "blur(12px) saturate(180%)",
                  WebkitBackdropFilter: "blur(12px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.55)",
                  boxShadow:
                    "inset 0 1px 1.5px rgba(255,255,255,0.7), inset 0 -1px 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <div className="absolute inset-0 rounded-[10px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)" }} />
                <span className="font-['Rubik'] text-[10px] font-medium text-black/80 relative z-10 capitalize">
                  {categoryStyle.label}
                </span>
              </div>

              {/* Date badge */}
              {email.date && (
                <div
                  className="px-3 py-1 rounded-[10px] h-[22px] flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(180,180,180,0.45) 0%, rgba(220,220,220,0.25) 100%)",
                    border: "1px solid rgba(255,255,255,0.55)",
                  }}
                >
                  <span className="font-['Rubik'] text-[10px] font-medium text-black/60 relative z-10">
                    {email.date}
                  </span>
                </div>
              )}
            </div>

            {/* Summary */}
            <p className="font-['Rubik'] text-[13px] text-black leading-[19px] tracking-[-0.2px] line-clamp-3">
              {email.summary}
            </p>
          </div>

          {/* Reply form (expandable) */}
          <AnimatePresence>
            {replyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-3"
              >
                <div className="bg-white/70 rounded-[16px] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Reply className="w-3.5 h-3.5 text-black/50" />
                    <span className="font-['Rubik'] text-[11px] text-black/60">
                      Reply to {email.senderEmail}
                    </span>
                  </div>
                  <textarea
                    className="w-full bg-white/60 rounded-[10px] border border-black/10 p-2 font-['Rubik'] text-[12px] text-black resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
                    rows={4}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    disabled={sendStatus === "sending" || sendStatus === "sent"}
                  />
                  {sendStatus === "error" && (
                    <p className="font-['Rubik'] text-[11px] text-red-600 mt-1">Failed to send. Please try again.</p>
                  )}
                  {sendStatus === "sent" && (
                    <p className="font-['Rubik'] text-[11px] text-green-700 mt-1">Reply sent ✓</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setReplyOpen(false); setSendStatus("idle"); }}
                      className="flex items-center gap-1 bg-black/8 hover:bg-black/15 transition-colors h-[24px] px-3 rounded-[12px]"
                    >
                      <X className="w-3 h-3 text-black/60" />
                      <span className="font-['Rubik'] text-[10px] text-black/60">Close</span>
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={sendStatus === "sending" || sendStatus === "sent"}
                      className="flex items-center gap-1 bg-black/80 hover:bg-black disabled:opacity-50 transition-colors h-[24px] px-3 rounded-[12px]"
                    >
                      {sendStatus === "sending" ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      ) : (
                        <Send className="w-3 h-3 text-white" />
                      )}
                      <span className="font-['Rubik'] text-[10px] text-white">
                        {sendStatus === "sending" ? "Sending…" : sendStatus === "sent" ? "Sent!" : "Send"}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="w-[calc(100%+40px)] -ml-5 border-b-[1px] border-black/10 mb-4" />

          {/* Bottom: sender + attachments + actions */}
          <div className="flex items-center justify-between w-full relative z-10 px-1">
            {/* Sender */}
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-full overflow-hidden shrink-0 bg-white">
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(email.senderEmail)}`}
                  alt={email.senderName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col -gap-1">
                <span className="font-['Rubik'] text-black text-[16px] tracking-[-0.23px] leading-tight">
                  {email.senderName}
                </span>
                <span className="font-['Rubik'] text-black/80 text-[10px] tracking-[-0.115px]">
                  {email.senderEmail}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Attachment icons */}
              {email.hasAttachments && attachmentsToShow.length > 0 && (
                <div className="flex items-center -space-x-2">
                  {attachmentsToShow.map((att, i) => {
                    const { Icon, bg, color } = attachmentIcon(att.mimeType);
                    return (
                      <div
                        key={i}
                        title={att.filename}
                        className={`w-[28px] h-[28px] rounded-full border-[2px] border-white/60 flex items-center justify-center shrink-0 shadow-sm`}
                        style={{ background: bg, zIndex: 30 - i * 10 }}
                      >
                        <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={2} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setReplyOpen((v) => !v); setSendStatus("idle"); }}
                  className="flex items-center gap-1 justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-3 rounded-[15px]"
                >
                  <Reply className="w-3 h-3 text-black" />
                  <span className="font-['Rubik'] text-black text-[11px] leading-none">reply</span>
                </button>
                <button
                  onClick={handleMarkAsRead}
                  className="flex items-center gap-1 justify-center bg-black/10 hover:bg-black/20 backdrop-blur-sm transition-colors h-[26px] px-3 rounded-[15px]"
                >
                  <CheckCheck className="w-3 h-3 text-black" />
                  <span className="font-['Rubik'] text-black text-[11px] leading-none">mark read</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

