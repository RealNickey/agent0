"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SlidesResultProps {
  result: any;
}

export function SlidesResult({ result }: SlidesResultProps) {
  if (!result || result.error) {
    return <Card className="p-4 text-sm text-destructive">Failed to create Google Slides presentation.</Card>;
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{result.title || "Presentation created"}</h3>
        <p className="text-xs text-muted-foreground">{result.slideCount || 0} slides</p>
      </div>
      {result.thumbnailLink ? <img src={result.thumbnailLink} alt="Slides thumbnail" className="rounded-md border" /> : null}
      <Button asChild>
        <a href={result.webViewLink || result.slidesUrl} target="_blank" rel="noreferrer">Open in Google Slides</a>
      </Button>
    </Card>
  );
}
