"use client";

import { format } from "date-fns";
import { MailIcon, UserIcon, CalendarIcon, PaperclipIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface EmailMessageProps {
  id: string;
  from: string;
  to: string;
  subject: string;
  date?: string;
  snippet?: string;
  textContent?: string;
  htmlContent?: string;
  cc?: string;
  attachments?: Array<{ filename: string; mimeType: string; size: number }>;
  labelIds?: string[];
  className?: string;
}

export function EmailMessage({
  id,
  from,
  to,
  subject,
  date,
  snippet,
  textContent,
  htmlContent,
  cc,
  attachments,
  labelIds,
  className,
}: EmailMessageProps) {
  const parsedDate = date ? new Date(date) : null;
  const content = textContent || htmlContent || snippet || "";
  const isUnread = labelIds?.includes("UNREAD");
  
  // Truncate long content for preview
  const previewContent = content.length > 500 
    ? content.substring(0, 500) + "..." 
    : content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        scale: { duration: 0.3 }
      }}
      className={cn(
        "w-full max-w-2xl my-4 not-prose",
        className
      )}
    >
      <div className={cn(
        "rounded-xl border backdrop-blur-sm shadow-lg overflow-hidden",
        isUnread 
          ? "border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-blue-500/3 to-transparent"
          : "border-border/20 bg-gradient-to-br from-muted/30 via-muted/10 to-transparent"
      )}>
        {/* Header */}
        <div className={cn(
          "border-b p-4",
          isUnread 
            ? "border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-transparent"
            : "border-border/10 bg-gradient-to-br from-muted/20 to-transparent"
        )}>
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={cn(
                "p-2 rounded-lg ring-1",
                isUnread
                  ? "bg-blue-500/10 text-blue-600 ring-blue-500/20"
                  : "bg-muted text-muted-foreground ring-border/20"
              )}
            >
              <MailIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className={cn(
                  "font-semibold text-base leading-tight",
                  isUnread ? "text-blue-700 dark:text-blue-400" : "text-foreground"
                )}>
                  {subject || "(No Subject)"}
                </h3>
                {isUnread && (
                  <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                    Unread
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="space-y-3"
          >
            {/* From/To/Date Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">From</span>
                  <p className="font-medium truncate">{from}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground">To</span>
                  <p className="font-medium truncate">{to}</p>
                </div>
              </div>

              {cc && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">CC</span>
                    <p className="font-medium truncate">{cc}</p>
                  </div>
                </div>
              )}

              {parsedDate && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium">
                    {format(parsedDate, "PPP 'at' p")}
                  </span>
                </div>
              )}
            </div>

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="pt-2 border-t border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs"
                    >
                      <PaperclipIcon className="h-3 w-3" />
                      <span className="font-medium truncate max-w-[200px]">
                        {att.filename}
                      </span>
                      <span className="text-muted-foreground">
                        ({(att.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email Content */}
            <div className="pt-2 border-t border-border/20">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {previewContent}
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="pt-2"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${id}`, '_blank')}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5 mr-2" />
              Open in Gmail
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
