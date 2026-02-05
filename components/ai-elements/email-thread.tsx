"use client";

import { format } from "date-fns";
import { MailIcon, MessageSquareIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface EmailThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date?: string;
  snippet?: string;
  textContent?: string;
  htmlContent?: string;
  cc?: string;
}

interface EmailThreadProps {
  threadId: string;
  messages: EmailThreadMessage[];
  messageCount: number;
  className?: string;
}

export function EmailThread({
  threadId,
  messages,
  messageCount,
  className,
}: EmailThreadProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(messages.length > 0 ? [messages[0].id] : [])
  );

  const toggleMessage = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedMessages(new Set(messages.map(m => m.id)));
  };

  const collapseAll = () => {
    setExpandedMessages(new Set());
  };

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
              <MessageSquareIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    Email Thread
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {messageCount} message{messageCount !== 1 ? 's' : ''} in conversation
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAll}
                    className="h-7 text-xs"
                  >
                    <ChevronDownIcon className="h-3 w-3 mr-1" />
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAll}
                    className="h-7 text-xs"
                  >
                    <ChevronUpIcon className="h-3 w-3 mr-1" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="divide-y divide-border/10">
          {messages.map((message, index) => {
            const isExpanded = expandedMessages.has(message.id);
            const parsedDate = message.date ? new Date(message.date) : null;
            const content = message.textContent || message.htmlContent || message.snippet || "";
            const previewContent = content.length > 200 
              ? content.substring(0, 200) + "..." 
              : content;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 hover:bg-muted/20 transition-colors"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleMessage(message.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground shrink-0">
                      <MailIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {message.from}
                          </p>
                          {parsedDate && (
                            <p className="text-xs text-muted-foreground">
                              {format(parsedDate, "PPP 'at' p")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>

                      <AnimatePresence>
                        {!isExpanded && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-muted-foreground line-clamp-2"
                          >
                            {message.snippet || previewContent}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 ml-11 space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="text-xs">
                          <span className="text-muted-foreground">To: </span>
                          <span className="font-medium">{message.to}</span>
                        </div>
                        {message.cc && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">CC: </span>
                            <span className="font-medium">{message.cc}</span>
                          </div>
                        )}
                        {message.subject && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Subject: </span>
                            <span className="font-medium">{message.subject}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-md bg-muted/30 border border-border/20">
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                          {content}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/10 bg-gradient-to-br from-muted/10 to-transparent">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${threadId}`, '_blank')}
          >
            <ExternalLinkIcon className="h-3.5 w-3.5 mr-2" />
            Open Thread in Gmail
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
