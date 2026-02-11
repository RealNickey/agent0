"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ToolUIPart } from "ai";
import type { SlideOutline } from "@/types/slides";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { MyUIMessage } from "@/types/chat";

interface SlidesApprovalProps {
  approval?: ToolUIPart["approval"];
  outline?: SlideOutline;
  addToolApprovalResponse: UseChatHelpers<MyUIMessage>["addToolApprovalResponse"];
}

export function SlidesApproval({ approval, outline, addToolApprovalResponse }: SlidesApprovalProps) {
  if (!approval) return null;

  const slideTitles = outline?.slides?.map((slide) => slide.title).filter(Boolean) || [];
  const imageCount = outline?.slides?.filter((slide) => slide.imageQuery || slide.imageUrl).length || 0;

  return (
    <Card className="p-4 space-y-4 border border-primary/20 bg-primary/5">
      <div>
        <h3 className="text-base font-semibold">Ready to create Google Slides?</h3>
        <p className="text-xs text-muted-foreground">
          This will generate {outline?.slides?.length || 0} slides and upload them to your Google Drive.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{slideTitles.length} slide titles</span>
        <span>{imageCount} image queries</span>
        {outline?.theme?.primaryColor && (
          <span className="flex items-center gap-1">
            Theme
            <span
              className="inline-block h-3 w-3 rounded-full border"
              style={{ backgroundColor: outline.theme.primaryColor }}
            />
          </span>
        )}
      </div>

      {slideTitles.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
          {slideTitles.slice(0, 6).map((title) => (
            <li key={title}>{title}</li>
          ))}
          {slideTitles.length > 6 && <li>+{slideTitles.length - 6} more</li>}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => addToolApprovalResponse({ id: approval.id, approved: false })}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => addToolApprovalResponse({ id: approval.id, approved: true })}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Create & Upload
        </Button>
      </div>
    </Card>
  );
}
