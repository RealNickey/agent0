"use client";

import { format } from "date-fns";
import { MailIcon, SearchIcon, ExternalLinkIcon, InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface EmailSearchResult {
  id: string;
  threadId: string;
  from: string;
  to?: string;
  subject: string;
  date?: string;
  snippet?: string;
  labelIds?: string[];
}

interface EmailSearchResultsProps {
  query: string;
  messages: EmailSearchResult[];
  messageCount: number;
  className?: string;
}

export function EmailSearchResults({
  query,
  messages,
  messageCount,
  className,
}: EmailSearchResultsProps) {
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
      <div className="rounded-xl border border-border/20 bg-gradient-to-br from-muted/30 via-muted/10 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/10 bg-gradient-to-br from-muted/20 to-transparent p-4">
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-muted text-muted-foreground ring-1 ring-border/20"
            >
              <SearchIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-foreground">
                Email Search Results
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Found {messageCount} email{messageCount !== 1 ? 's' : ''} matching "{query}"
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        {messages.length === 0 ? (
          <div className="p-8 text-center">
            <InboxIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No emails found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {messages.map((message, index) => {
              const parsedDate = message.date ? new Date(message.date) : null;
              const isUnread = message.labelIds?.includes("UNREAD");

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-4 hover:bg-muted/20 transition-colors cursor-pointer",
                    isUnread && "bg-blue-500/5"
                  )}
                  onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${message.id}`, '_blank')}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0",
                      isUnread 
                        ? "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      <MailIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isUnread && "text-blue-700 dark:text-blue-400"
                            )}>
                              {message.from}
                            </p>
                            {isUnread && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className={cn(
                            "text-sm truncate mt-0.5",
                            isUnread ? "font-medium" : "text-muted-foreground"
                          )}>
                            {message.subject || "(No Subject)"}
                          </p>
                        </div>
                        {parsedDate && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(parsedDate, "MMM d")}
                          </span>
                        )}
                      </div>
                      {message.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {message.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {messages.length > 0 && (
          <div className="p-4 border-t border-border/10 bg-gradient-to-br from-muted/10 to-transparent">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`, '_blank')}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5 mr-2" />
              View All Results in Gmail
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
