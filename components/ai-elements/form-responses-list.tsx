"use client";

import { format } from "date-fns";
import { 
  FileTextIcon, 
  UserIcon, 
  ClockIcon,
  InboxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers: Record<string, string | string[]>;
}

interface FormResponsesListProps {
  formId: string;
  responseCount: number;
  responses: FormResponse[];
  checkedAt?: string;
}

export function FormResponsesList({
  formId,
  responseCount,
  responses,
  checkedAt,
}: FormResponsesListProps) {
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set());

  const toggleResponse = (responseId: string) => {
    setExpandedResponses(prev => {
      const next = new Set(prev);
      if (next.has(responseId)) {
        next.delete(responseId);
      } else {
        next.add(responseId);
      }
      return next;
    });
  };

  if (responseCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-muted bg-muted/5 p-6">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <InboxIcon className="w-10 h-10 opacity-50" />
            <div className="text-center">
              <p className="font-medium">No New Responses</p>
              <p className="text-sm mt-1">No submissions found since last check</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-2xl my-4 not-prose"
    >
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-blue-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20">
              <FileTextIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Form Responses</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {responseCount} new response{responseCount !== 1 ? 's' : ''} 
                {checkedAt && ` • Checked ${format(new Date(checkedAt), "MMM d, h:mm a")}`}
              </p>
            </div>
          </div>
        </div>

        {/* Responses List */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-2 space-y-2">
            {responses.map((response, index) => {
              const isExpanded = expandedResponses.has(response.responseId);
              const submittedAt = new Date(response.lastSubmittedTime || response.createTime);
              
              return (
                <motion.div
                  key={response.responseId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-lg border border-border/50 bg-background/30 overflow-hidden"
                >
                  <button
                    onClick={() => toggleResponse(response.responseId)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                    
                    <div className="p-1.5 rounded-full bg-muted/50">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {response.respondentEmail || `Response #${index + 1}`}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ClockIcon className="w-3 h-3" />
                        <span>{format(submittedAt, "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                    
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/30 rounded-full">
                      {Object.keys(response.answers).length} answer{Object.keys(response.answers).length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/30"
                      >
                        <div className="p-3 space-y-2 bg-muted/10">
                          {Object.entries(response.answers).map(([questionId, answer], ansIndex) => (
                            <div key={questionId} className="text-sm">
                              <p className="text-xs text-muted-foreground mb-1">
                                Question {ansIndex + 1}
                              </p>
                              <p className="text-foreground">
                                {Array.isArray(answer) ? answer.join(", ") : answer}
                              </p>
                            </div>
                          ))}
                          {Object.keys(response.answers).length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                              No answers recorded
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
