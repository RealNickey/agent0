"use client";

import { format } from "date-fns";
import { 
  FileTextIcon, 
  BarChart3Icon, 
  UsersIcon,
  ExternalLinkIcon,
  TrendingUpIcon,
  ClockIcon,
  MessageSquareIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuestionSummary {
  questionId: string;
  title: string;
  type?: string;
  totalAnswers: number;
  distribution: Array<{
    answer: string;
    count: number;
    percentage: number;
  }>;
}

interface FormSummaryCardProps {
  formId: string;
  formTitle: string;
  totalResponses: number;
  questionCount: number;
  responderUri?: string;
  firstResponseAt?: string | null;
  lastResponseAt?: string | null;
  questionSummaries: QuestionSummary[];
}

export function FormSummaryCard({
  formId,
  formTitle,
  totalResponses,
  questionCount,
  responderUri,
  firstResponseAt,
  lastResponseAt,
  questionSummaries,
}: FormSummaryCardProps) {
  const getColorForIndex = (index: number) => {
    const colors = [
      "bg-purple-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
      "bg-red-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-2xl my-4 not-prose"
    >
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-emerald-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
              <BarChart3Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">{formTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Response Summary</p>
            </div>
            {responderUri && (
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <a href={responderUri} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="w-3 h-3" />
                  Open Form
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 p-4 border-b border-border/30">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <UsersIcon className="w-4 h-4" />
              <span className="text-xs">Responses</span>
            </div>
            <p className="text-2xl font-bold">{totalResponses}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <MessageSquareIcon className="w-4 h-4" />
              <span className="text-xs">Questions</span>
            </div>
            <p className="text-2xl font-bold">{questionCount}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <TrendingUpIcon className="w-4 h-4" />
              <span className="text-xs">Avg/Question</span>
            </div>
            <p className="text-2xl font-bold">
              {questionCount > 0 
                ? Math.round((questionSummaries.reduce((sum, q) => sum + q.totalAnswers, 0) / questionCount))
                : 0}
            </p>
          </motion.div>
        </div>

        {/* Timeline */}
        {(firstResponseAt || lastResponseAt) && (
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-4 text-sm text-muted-foreground">
            <ClockIcon className="w-4 h-4" />
            <div className="flex-1 flex items-center gap-2">
              {firstResponseAt && (
                <span>First: {format(new Date(firstResponseAt), "MMM d, yyyy")}</span>
              )}
              {firstResponseAt && lastResponseAt && <span>•</span>}
              {lastResponseAt && (
                <span>Last: {format(new Date(lastResponseAt), "MMM d, yyyy")}</span>
              )}
            </div>
          </div>
        )}

        {/* Question Summaries */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-4 space-y-4">
            {questionSummaries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileTextIcon className="w-10 h-10 mx-auto opacity-50 mb-2" />
                <p>No response data available yet</p>
              </div>
            ) : (
              questionSummaries.map((question, qIndex) => (
                <motion.div
                  key={question.questionId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: qIndex * 0.05 }}
                  className="rounded-lg border border-border/50 bg-background/30 p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="font-medium text-sm flex-1">{question.title}</h4>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted/30 rounded-full">
                      {question.totalAnswers} answer{question.totalAnswers !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {question.distribution.length > 0 ? (
                    <div className="space-y-2">
                      {question.distribution.map((item, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              {item.answer}
                            </span>
                            <span className="text-xs font-medium">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percentage}%` }}
                              transition={{ delay: qIndex * 0.05 + index * 0.02, duration: 0.5 }}
                              className={cn("absolute inset-y-0 left-0 rounded-full", getColorForIndex(index))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No answers for this question
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
