"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogDescription,
  MorphingDialogImage,
} from "@/components/ui/morphing-dialog";
import { Sparkles, Download, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export type GeneratedImageDialogProps = {
  base64: string;
  mediaType: string;
  prompt: string;
  width: number;
  height: number;
  seed?: number | null;
  isGenerating?: boolean;
};

export function GeneratedImageDialog({
  base64,
  mediaType,
  prompt,
  width,
  height,
  seed,
  isGenerating = false,
}: GeneratedImageDialogProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (base64 && !isGenerating) {
      const dataUrl = `data:${mediaType};base64,${base64}`;
      setImageUrl(dataUrl);
      
      // Preload image for smooth reveal
      const img = new window.Image();
      img.onload = () => {
        setTimeout(() => setImageLoaded(true), 100);
      };
      img.src = dataUrl;
    }
  }, [base64, mediaType, isGenerating]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.download = `generated-image-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };

  if (isGenerating) {
    return <GeneratingPlaceholder prompt={prompt} />;
  }

  return (
    <MorphingDialog
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
    >
      <MorphingDialogTrigger
        style={{
          borderRadius: "16px",
        }}
        className={cn(
          "group relative flex max-w-md flex-col overflow-hidden border border-border bg-card shadow-lg transition-all hover:shadow-xl",
          !imageLoaded && "animate-pulse"
        )}
      >
        <div className="grow">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="size-8 border-4 border-primary border-t-transparent rounded-full"
              />
            </div>
          )}
          <MorphingDialogImage
            src={imageUrl}
            alt={prompt}
            className={cn(
              "h-64 w-full object-cover transition-opacity duration-500",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: imageLoaded ? 1 : 0 }}
            className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{
              y: imageLoaded ? 0 : 10,
              opacity: imageLoaded ? 1 : 0,
            }}
            className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="flex items-center gap-2 text-white text-xs">
              <Sparkles className="size-3" />
              <span>Click to expand</span>
            </div>
          </motion.div>
        </div>
        <div className="flex grow flex-row items-start justify-between p-3 gap-3">
          <div className="flex-1 min-w-0">
            <MorphingDialogTitle className="text-sm font-medium text-foreground truncate">
              Generated Image
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {prompt}
            </MorphingDialogSubtitle>
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: imageLoaded ? 1 : 0,
              opacity: imageLoaded ? 1 : 0,
            }}
            transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
            className="shrink-0"
          >
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
          </motion.div>
        </div>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{
            borderRadius: "24px",
          }}
          className="pointer-events-auto relative flex h-auto w-[50vw] min-w-[400px] max-w-[90vw] flex-col overflow-hidden border border-border bg-card shadow-2xl"
        >
          <MorphingDialogImage
            src={imageUrl}
            alt={prompt}
            className="h-auto w-full object-contain"
            style={{ maxHeight: "calc(50vh - 8rem)" }}
          />
          <div className="p-6 space-y-4">
            <div>
              <MorphingDialogTitle className="text-2xl font-semibold text-foreground">
                Generated Image
              </MorphingDialogTitle>
              <MorphingDialogSubtitle className="text-sm text-muted-foreground mt-1">
                {width} × {height}
                {seed != null && ` · Seed: ${seed}`}
              </MorphingDialogSubtitle>
            </div>
            <MorphingDialogDescription
              disableLayoutAnimation
              variants={{
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 10 },
              }}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Prompt
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {prompt}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download className="size-4" />
                    Download
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <Copy className="size-4" />
                    Copy Prompt
                  </motion.button>
                </div>
              </div>
            </MorphingDialogDescription>
          </div>
          <MorphingDialogClose
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

function GeneratingPlaceholder({ prompt }: { prompt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
    >
      {/* Minimalist animated background */}
      <div className="relative h-64 w-full flex items-center justify-center bg-muted/20 overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
              "radial-gradient(circle at 70% 70%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
              "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Center breathing element */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="relative flex items-center justify-center size-12 rounded-full border border-primary/20 bg-background/50 backdrop-blur-sm shadow-sm"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="size-5 text-primary" />
            </motion.div>
          </div>
          
          <div className="space-y-1.5 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Dreaming
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              >.</motion.span>
               <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              >.</motion.span>
               <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              >.</motion.span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 bg-background/50 px-4 py-3 backdrop-blur-sm">
        <p className="text-xs text-foreground/70 truncate text-center font-medium">
          {prompt}
        </p>
      </div>
    </motion.div>
  );
}
