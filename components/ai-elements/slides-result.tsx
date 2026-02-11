"use client";

import { ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SlidesResultSuccess = {
  status: "created";
  slidesUrl: string;
  fileId: string;
  slideCount: number;
  title: string;
  thumbnailLink?: string;
};

type SlidesResultFailure = {
  error: true;
  message: string;
};

interface SlidesResultProps {
  result: SlidesResultSuccess | SlidesResultFailure | null | undefined;
  denied?: boolean;
}

export function SlidesResult({ result, denied }: SlidesResultProps) {
  if (denied) {
    return (
      <Card className="p-4 border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Upload cancelled</span>
        </div>
      </Card>
    );
  }

  if (!result || ("error" in result && result.error)) {
    return (
      <Card className="p-4 border border-red-500/30 bg-red-500/5">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to create presentation</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {result?.message || "The presentation could not be uploaded."}
        </p>
      </Card>
    );
  }

  const successResult = result as SlidesResultSuccess;

  return (
    <Card className="p-4 space-y-3 border border-green-500/30 bg-green-500/5">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Presentation created</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{successResult.title}</h3>
          <p className="text-xs text-muted-foreground">{successResult.slideCount} slides</p>
        </div>
        {successResult.thumbnailLink && (
          <img
            src={successResult.thumbnailLink}
            alt={successResult.title}
            className="h-16 w-24 rounded border object-cover"
          />
        )}
      </div>
      <Button variant="outline" size="sm" className="w-full" asChild>
        <a href={successResult.slidesUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in Google Slides
        </a>
      </Button>
    </Card>
  );
}
