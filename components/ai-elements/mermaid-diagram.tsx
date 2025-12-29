"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { AlertCircleIcon } from "lucide-react";

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

// Initialize mermaid with configuration
let mermaidInitialized = false;

export function MermaidDiagram({ code, className = "" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "inherit",
      });
      mermaidInitialized = true;
    }
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code) return;

      setIsRendering(true);
      setError(null);

      try {
        // Generate a unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        
        // Clear previous content
        containerRef.current.innerHTML = "";

        // Render the diagram
        const { svg } = await mermaid.render(id, code);
        
        // Insert the SVG
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error 
            ? err.message 
            : "Failed to render diagram. Please check your mermaid syntax."
        );
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertCircleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm text-destructive font-medium">Diagram Rendering Error</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`mermaid-diagram-container overflow-x-auto ${className}`}
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "1rem",
        background: "hsl(var(--muted) / 0.3)",
        borderRadius: "0.5rem",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {isRendering && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Rendering diagram...
        </div>
      )}
    </div>
  );
}
