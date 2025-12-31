"use client";

import { cn } from "@/lib/utils";
import { Lightbulb, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Insight = {
  id: string;
  text: string;
  type: "pattern" | "suggestion" | "summary";
};

export type InsightsWidgetProps = {
  insights: Insight[];
  onAskAgent?: (insight: string) => void;
  className?: string;
};

export function InsightsWidget({
  insights,
  onAskAgent,
  className,
}: InsightsWidgetProps) {
  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "pattern":
        return <TrendingUp className="size-4 text-primary" />;
      case "suggestion":
        return <Lightbulb className="size-4 text-amber-500" />;
      default:
        return <Lightbulb className="size-4 text-primary" />;
    }
  };

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <div className="flex items-center gap-2 p-4 border-b">
        <Lightbulb className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">AI Insights</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[200px]">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No insights available yet
          </p>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-background border"
            >
              {getIcon(insight.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm">{insight.text}</p>
                {onAskAgent && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs"
                    onClick={() => onAskAgent(insight.text)}
                  >
                    Ask Agent <ArrowRight className="size-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
