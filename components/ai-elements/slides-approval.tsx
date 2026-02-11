
"use client";

import { useState } from "react";
import { SlideOutline } from "@/types/slides";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Presentation, Palette, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner or similar is used, or basic alert. Let's use basic logic for now or window.alert if needed, but better to just show error in UI.

interface SlidesApprovalProps {
  toolCallId: string;
  outline: SlideOutline;
  addToolApprovalResponse: (args: { toolCallId: string; result: any }) => void;
}

export function SlidesApproval({
  toolCallId,
  outline,
  addToolApprovalResponse,
}: SlidesApprovalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const slideCount = outline.slides.length;
  const imageCount = outline.slides.filter(s => s.imageUrl).length;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/slides/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });

      const data = await response.json();

      if (data.error) {
        // Handle error - passing error result back to tool
        addToolApprovalResponse({
          toolCallId,
          result: { error: true, message: data.message }
        });
      } else {
        // Success
        addToolApprovalResponse({
          toolCallId,
          result: data
        });
      }
    } catch (error) {
      console.error("Failed to create slides:", error);
      addToolApprovalResponse({
        toolCallId,
        result: { error: true, message: "Network request failed" }
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-primary/20 bg-card shadow-sm">
      <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Create Presentation?</CardTitle>
            <CardDescription className="text-xs">
              Review details before creating Google Slides
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-dashed">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium truncate max-w-[200px] text-right" title={outline.title}>
              {outline.title}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-dashed">
            <span className="text-muted-foreground">Slides</span>
            <span className="font-medium">{slideCount}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-dashed">
            <span className="text-muted-foreground">Images</span>
            <div className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{imageCount}</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-dashed">
            <span className="text-muted-foreground">Theme</span>
            <div className="flex items-center gap-1">
              <Palette className="w-3 h-3 text-muted-foreground" />
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: outline.theme.primaryColor }}
              />
              <span className="font-medium text-xs font-mono">{outline.theme.fontFamily}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
            onClick={() => addToolApprovalResponse({ toolCallId, result: { error: true, message: "User cancelled creation." } })}
            disabled={isCreating}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create & Upload
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
