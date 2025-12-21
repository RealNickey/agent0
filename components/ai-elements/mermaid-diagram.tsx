"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type MermaidThemeColors = {
  primary: string;
  primaryForeground: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  background: string;
};

function readCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function labToRgbString(lab: string): string | null {
  const match = lab
    .trim()
    .match(
      /^lab\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s+([+-]?(?:\d+\.?\d*|\.\d+))\s+([+-]?(?:\d+\.?\d*|\.\d+))(?:\s*\/\s*([^)]+))?\s*\)$/i
    );
  if (!match) return null;

  const L = Number(match[1]);
  const a = Number(match[2]);
  const b = Number(match[3]);
  if ([L, a, b].some((n) => Number.isNaN(n))) return null;

  // CSS lab() is defined relative to D50.
  // Convert Lab(D50) -> XYZ(D50) -> XYZ(D65) -> sRGB.
  const Xn = 96.4212;
  const Yn = 100.0;
  const Zn = 82.5188;

  const delta = 6 / 29;
  const finv = (t: number) => {
    if (t > delta) return t ** 3;
    return 3 * delta * delta * (t - 4 / 29);
  };

  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  let X = Xn * finv(fx);
  let Y = Yn * finv(fy);
  let Z = Zn * finv(fz);

  // Bradford adaptation D50 -> D65
  const Xd = 0.9555766 * X + -0.0230393 * Y + 0.0631636 * Z;
  const Yd = -0.0282895 * X + 1.0099416 * Y + 0.0210077 * Z;
  const Zd = 0.0122982 * X + -0.020483 * Y + 1.3299098 * Z;
  X = Xd;
  Y = Yd;
  Z = Zd;

  // XYZ (0..100) -> linear RGB (0..1)
  const x = X / 100;
  const y = Y / 100;
  const z = Z / 100;

  let r = 3.2406 * x + -1.5372 * y + -0.4986 * z;
  let g = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  let bl = 0.0557 * x + -0.204 * y + 1.057 * z;

  const compand = (c: number) => {
    const cc = clamp01(c);
    if (cc <= 0.0031308) return 12.92 * cc;
    return 1.055 * Math.pow(cc, 1 / 2.4) - 0.055;
  };

  r = compand(r);
  g = compand(g);
  bl = compand(bl);

  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(bl * 255);

  return `rgb(${R}, ${G}, ${B})`;
}

function resolveToRgb(colorValue: string): string {
  if (typeof window === "undefined") return colorValue;

  // Mermaid only accepts a limited set of color syntaxes (hex/rgb/hsl).
  // Our theme vars are OKLCH with alpha in some cases; Chromium can compute those
  // into lab()/oklch() strings, which Mermaid rejects. Canvas normalizes to
  // a Mermaid-friendly string (usually #rrggbb or rgba()).
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000";
      ctx.fillStyle = colorValue;
      const normalized = String(ctx.fillStyle);

      if (normalized.startsWith("lab(")) {
        const rgb = labToRgbString(normalized);
        if (rgb) return rgb;
      }

      if (normalized.startsWith("rgba(")) {
        const match = normalized.match(
          /^rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)$/
        );
        if (match) {
          const r = match[1];
          const g = match[2];
          const b = match[3];
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      return normalized;
    }
  } catch {
    // fall through
  }

  // Fallback: computed style (may still return lab()/oklch() in some browsers)
  // but better than failing hard.
  const probe = document.createElement("span");
  probe.style.color = colorValue;
  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  if (computed.startsWith("lab(")) {
    const rgb = labToRgbString(computed);
    if (rgb) return rgb;
  }

  return computed;
}

function getComputedVarColor(varName: string, property: "color" | "backgroundColor" | "borderColor") {
  if (typeof window === "undefined") return "";

  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  (probe.style as any)[property] = `var(${varName})`;
  document.body.appendChild(probe);

  const computed = (getComputedStyle(probe) as any)[property] as string;
  document.body.removeChild(probe);

  return resolveToRgb(computed);
}

function getMermaidThemeColors(): MermaidThemeColors {
  // Prefer computed values from var() so we don't pass OKLCH/LAB directly.
  const primary = getComputedVarColor("--primary", "color") || "rgb(99, 102, 241)";
  const primaryForeground =
    getComputedVarColor("--primary-foreground", "color") || "rgb(255, 255, 255)";
  const foreground = getComputedVarColor("--foreground", "color") || "rgb(248, 250, 252)";
  const mutedForeground =
    getComputedVarColor("--muted-foreground", "color") || "rgb(148, 163, 184)";
  const border = getComputedVarColor("--border", "borderColor") || "rgb(71, 85, 105)";
  const card = getComputedVarColor("--card", "backgroundColor") || "rgb(31, 41, 55)";
  const background =
    getComputedVarColor("--background", "backgroundColor") || "rgb(17, 24, 39)";

  return {
    primary,
    primaryForeground,
    foreground,
    mutedForeground,
    border,
    card,
    background,
  };
}

function ensureMermaidInitialized() {
  if (typeof window === "undefined") return;
  const c = getMermaidThemeColors();

  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    fontFamily: "inherit",
    themeVariables: {
      primaryColor: c.primary,
      primaryTextColor: c.foreground,
      primaryBorderColor: c.primary,
      lineColor: c.mutedForeground,
      secondaryColor: c.card,
      tertiaryColor: c.background,
      background: c.background,
      mainBkg: c.card,
      nodeBorder: c.border,
      clusterBkg: c.card,
      titleColor: c.foreground,
    },
  });
}

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomLimits = useMemo(() => ({ min: 0.4, max: 4 }), []);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!diagramCode || !containerRef.current) return;

      setIsRendering(true);
      setError(null);

      try {
        ensureMermaidInitialized();
        // Generate a unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Validate and render the diagram
        const { svg } = await mermaid.render(id, diagramCode);

        if (isMounted) {
          // Sanitize the SVG to prevent XSS attacks
          setSvgContent(sanitizeSvg(svg));
          setError(null);
          // Reset pan/zoom whenever we render a new diagram.
          setZoom(1);
          setPan({ x: 0, y: 0 });
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

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const handleWheel = (e: React.WheelEvent) => {
    if (!svgContent) return;
    e.preventDefault();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = 1.1;
    const nextZoomRaw = direction > 0 ? zoom * factor : zoom / factor;
    const nextZoom = clamp(nextZoomRaw, zoomLimits.min, zoomLimits.max);

    // Zoom around cursor: keep world-point under cursor stable.
    const worldX = (cursorX - pan.x) / zoom;
    const worldY = (cursorY - pan.y) / zoom;
    const nextPanX = cursorX - worldX * nextZoom;
    const nextPanY = cursorY - worldY * nextZoom;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!svgContent) return;
    if (e.button !== 0) return;

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    isPanningRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    const last = lastPointerRef.current;
    if (!last) return;

    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isPanningRef.current = false;
    lastPointerRef.current = null;
  };

  const handleDoubleClick = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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
              ? "h-[calc(100%-3rem)] overflow-hidden"
              : "min-h-[300px] overflow-hidden"
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
              ref={viewportRef}
              className={cn(
                "relative w-full h-full",
                "cursor-grab active:cursor-grabbing",
                isExpanded ? "min-h-[400px]" : "min-h-[300px]"
              )}
              style={{ touchAction: "none" }}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={handleDoubleClick}
              aria-label="Diagram viewport (scroll to zoom, drag to pan)"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "absolute inset-0 flex items-start justify-center",
                  "[&_svg]:h-auto [&_svg]:max-w-none"
                )}
              >
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                    willChange: "transform",
                  }}
                  className={cn(
                    "inline-block",
                    // Ensure SVG uses its intrinsic size unless constrained by our transforms.
                    isExpanded ? "[&_svg]:max-h-[calc(100vh-12rem)]" : "[&_svg]:w-full"
                  )}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
