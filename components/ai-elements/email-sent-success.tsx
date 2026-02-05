"use client";

import { CheckCircle2Icon, MailIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface EmailSentSuccessProps {
  to: string;
  subject: string;
  messageId?: string;
  threadId?: string;
  className?: string;
}

export function EmailSentSuccess({
  to,
  subject,
  messageId,
  threadId,
  className,
}: EmailSentSuccessProps) {
  const gmailUrl = messageId 
    ? `https://mail.google.com/mail/u/0/#sent/${messageId}`
    : threadId 
    ? `https://mail.google.com/mail/u/0/#inbox/${threadId}`
    : "https://mail.google.com/mail/u/0/#sent";

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
        "w-full max-w-lg my-4 not-prose",
        className
      )}
    >
      <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
            >
              <CheckCircle2Icon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-green-700 dark:text-green-400">Email Sent Successfully</h3>
              <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">Your message has been delivered</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">To</p>
            <p className="font-medium">{to}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Subject</p>
            <p className="font-semibold text-lg">{subject}</p>
          </div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="pt-2"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(gmailUrl, '_blank')}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5 mr-2" />
              View in Gmail
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
