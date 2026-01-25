"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Initialize once
if (typeof window !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    fontFamily: "var(--font-sans)",
  });
}

interface MermaidProps {
  code: string;
  caption?: string;
  className?: string;
}

export function Mermaid({ code, caption, className }: MermaidProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elementId = useRef(`mermaid-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        // mermaid.render returns objects with svg property in v10+
        const { svg } = await mermaid.render(elementId, code);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    };

    if (code) {
      renderDiagram();
    }
  }, [code, elementId]);

  if (error) {
    return (
      <div className={cn("p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive text-sm", className)}>
        <p className="font-semibold mb-1">Failed to render diagram</p>
        <pre className="whitespace-pre-wrap text-xs">{error}</pre>
        <pre className="mt-2 text-xs opacity-50 overflow-x-auto p-2 bg-black/20 rounded">{code}</pre>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center my-4 w-full", className)}>
      <div 
        className="w-full overflow-x-auto bg-card border rounded-lg p-4 flex justify-center min-h-[100px]"
      >
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full flex justify-center" />
        ) : (
          <div className="flex items-center justify-center h-24 w-full text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Rendering diagram...
          </div>
        )}
      </div>
      {caption && (
        <p className="text-xs text-muted-foreground mt-2 text-center">{caption}</p>
      )}
    </div>
  );
}
