"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Maximize2, Minimize2, Download, FileImage, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "motion/react";
import mermaid from "mermaid";
import DOMPurify from "dompurify";

// Initialize mermaid with dark theme settings and strict security
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
  fontFamily: "inherit",
  themeVariables: {
    primaryColor: "#6366f1",
    primaryTextColor: "#fff",
    primaryBorderColor: "#4f46e5",
    lineColor: "#6b7280",
    secondaryColor: "#374151",
    tertiaryColor: "#1f2937",
    background: "#111827",
    mainBkg: "#1f2937",
    nodeBorder: "#4f46e5",
    clusterBkg: "#1f2937",
    titleColor: "#f9fafb",
  },
});

// Sanitize SVG content to prevent XSS attacks
function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["foreignObject"],
  });
}

export type MermaidDiagramProps = {
  diagramCode: string;
  title?: string;
  className?: string;
};

export function MermaidDiagram({
  diagramCode,
  title,
  className,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!diagramCode || !containerRef.current) return;

      setIsRendering(true);
      setError(null);

      try {
        // Generate a unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Validate and render the diagram
        const { svg } = await mermaid.render(id, diagramCode);

        if (isMounted) {
          // Sanitize the SVG to prevent XSS attacks
          setSvgContent(sanitizeSvg(svg));
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Mermaid rendering error:", err);
          setError(
            err instanceof Error ? err.message : "Failed to render diagram"
          );
          setSvgContent(null);
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [diagramCode]);

  const handleDownload = (format: "svg" | "jpg") => {
    if (!svgContent) return;

    const filename = title || "diagram";

    if (format === "svg") {
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === "jpg") {
      // Convert SVG to JPG using canvas
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      
      img.onerror = () => {
        console.error("Failed to load SVG for JPG conversion");
        URL.revokeObjectURL(url);
      };
      
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          // Use a higher resolution for better quality
          const scale = 2;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Fill with dark background for JPG (matching theme)
            ctx.fillStyle = "rgb(31, 41, 55)"; // gray-800 equivalent
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const jpgUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = jpgUrl;
                a.download = `${filename}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(jpgUrl);
              }
            }, "image/jpeg", 0.95);
          }
        } catch (err) {
          console.error("Failed to convert SVG to JPG:", err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      
      img.src = url;
    }
  };

  return (
    <>
      {/* Backdrop for fullscreen mode */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{
          layout: { type: "spring", stiffness: 300, damping: 30 },
        }}
        className={cn(
          "rounded-lg border bg-card/50 overflow-hidden",
          isExpanded
            ? "fixed inset-6 z-50 bg-background shadow-2xl"
            : "w-full min-w-0",
          className
        )}
      >
        {/* Header */}
        <motion.div
          layout="position"
          className="flex items-center justify-between gap-2 border-b px-4 py-2.5 bg-muted/30"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {title || "Mermaid Diagram"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {svgContent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                    aria-label="Download diagram"
                  >
                    <Download className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload("svg")}>
                    <FileCode className="size-4 mr-2" />
                    Download as SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("jpg")}>
                    <FileImage className="size-4 mr-2" />
                    Download as JPG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7"
              aria-label={isExpanded ? "Exit fullscreen" : "Fullscreen"}
            >
              {isExpanded ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
          </div>
        </motion.div>

        {/* Diagram Content */}
        <motion.div
          ref={containerRef}
          layout="position"
          className={cn(
            "p-6 flex items-center justify-center",
            isExpanded
              ? "h-[calc(100%-3rem)] overflow-auto"
              : "min-h-[300px] overflow-visible"
          )}
        >
          {isRendering && !svgContent && !error && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Rendering diagram...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-destructive p-4">
              <AlertCircle className="size-6" />
              <p className="text-sm font-medium">Failed to render diagram</p>
              <p className="text-xs text-muted-foreground text-center max-w-md">
                {error}
              </p>
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  View diagram code
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto max-w-full">
                  <code>{diagramCode}</code>
                </pre>
              </details>
            </div>
          )}

          {svgContent && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "[&_svg]:h-auto",
                isExpanded
                  ? "[&_svg]:max-w-full [&_svg]:max-h-full"
                  : "[&_svg]:w-full"
              )}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
