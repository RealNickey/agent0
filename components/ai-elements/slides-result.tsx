
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Presentation, ExternalLink, AlertCircle } from "lucide-react";
import Image from "next/image";

interface SlidesResultProps {
  status: string;
  slidesUrl?: string;
  fileId?: string;
  slideCount?: number;
  title?: string;
  thumbnailLink?: string;
  error?: boolean;
  message?: string;
}

export function SlidesResult(props: SlidesResultProps) {
  if (props.error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive text-base">Presentation Creation Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{props.message || "An error occurred while creating the presentation."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md overflow-hidden border-teal-500/20 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="bg-teal-500/5 border-b border-teal-500/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{props.title || "Presentation Ready"}</CardTitle>
            <CardDescription className="text-xs">
              {props.slideCount ? `${props.slideCount} slides created` : "Successfully created"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {props.thumbnailLink ? (
          <div className="relative aspect-video w-full bg-muted/20 border-b">
            {/* Use unoptimized image or standard img for external URLs if not whitelisted in Next.js config */}
            <img
              src={props.thumbnailLink}
              alt="Presentation thumbnail"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/5 hover:bg-black/0 transition-colors pointer-events-none" />
          </div>
        ) : (
          <div className="aspect-[2/1] w-full bg-muted/10 flex items-center justify-center text-muted-foreground/30 border-b">
            <Presentation className="w-12 h-12" />
          </div>
        )}

        <div className="p-4 bg-background">
          <Button
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => window.open(props.slidesUrl, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Slides
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            File saved to your Google Drive
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
