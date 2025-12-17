"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Maximize2, Minimize2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleDownload = () => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "diagram"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border bg-card/50 overflow-hidden",
        isExpanded && "fixed inset-4 z-50 bg-background",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-indigo-500" />
          <span className="text-sm font-medium text-foreground">
            {title || "Mermaid Diagram"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {svgContent && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDownload}
              className="h-6 w-6"
              aria-label="Download SVG"
            >
              <Download className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6"
            aria-label={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Diagram Content */}
      <div
        ref={containerRef}
        className={cn(
          "p-4 flex items-center justify-center overflow-auto",
          isExpanded ? "h-[calc(100%-3rem)]" : "min-h-[200px] max-h-[500px]"
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
          <div
            className="[&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
}
