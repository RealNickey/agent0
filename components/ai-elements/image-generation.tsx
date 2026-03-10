"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { ImageIcon, DownloadIcon, SparklesIcon, ZoomInIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelAnimation } from "@/components/ui/pixel-animation";

// ─────────────────────────────────────────────────────────────────────────────
// Tilt hook — smooth 3-D perspective tilt following cursor
// ─────────────────────────────────────────────────────────────────────────────
function useTilt(strength = 8) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 26 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 26 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(dx * strength * 2);
    rotateX.set(-dy * strength * 2);
  }, [rotateX, rotateY, strength]);

  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  return { springX, springY, onMouseMove, onMouseLeave };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={src}
            alt={alt}
            className="relative z-10 max-w-full max-h-full rounded-3xl shadow-2xl object-contain ring-1 ring-white/10"
            initial={{ scale: 0.86, opacity: 0, y: 32, filter: "blur(12px)" }}
            animate={{ scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ scale: 0.92, opacity: 0, y: 12, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder — blurred abstract for loading backdrop
// ─────────────────────────────────────────────────────────────────────────────
const PLACEHOLDER_URL =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=40&w=800&auto=format&fit=crop";

// ─────────────────────────────────────────────────────────────────────────────
// Core unified component — handles BOTH loading AND result in one stable node.
// No mount/unmount means zero layout shift.
// ─────────────────────────────────────────────────────────────────────────────
interface ImageGenerationProps {
  imageId?: string;
  imageUrl?: string;
  mediaType?: string;
  prompt?: string;
  model?: string;
  error?: boolean;
  message?: string;
  isReady?: boolean;
}

export function ImageGeneration({
  imageId,
  imageUrl,
  mediaType,
  prompt,
  model,
  error,
  message: errorMessage,
  isReady = false,
}: ImageGenerationProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // revealed = true once generated image has loaded from network
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const revealDone = isReady && imageLoaded;

  const { springX, springY, onMouseMove, onMouseLeave } = useTilt(6);

  const src = imageUrl ?? (imageId ? `/api/images/${encodeURIComponent(imageId)}` : null);

  // Reset loading state whenever the image source changes (e.g. new generation).
  // Also handles the cached-image edge case where the browser fires the load
  // event synchronously before React attaches onLoad — check img.complete.
  useEffect(() => {
    setImageLoaded(false);
    if (!src) return;
    // In the next tick the <img> will be in the DOM; check if already complete.
    const frame = requestAnimationFrame(() => {
      if (imgRef.current?.complete) {
        setImageLoaded(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [src]);

  const extension =
    mediaType === "image/png"
      ? "png"
      : mediaType === "image/jpeg"
      ? "jpg"
      : mediaType === "image/webp"
      ? "webp"
      : "bin";

  const handleDownload = useCallback(async () => {
    if (!src || !mediaType) return;
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const responseType = response.headers.get("content-type") || mediaType;
      if (!responseType.startsWith("image/")) throw new Error("Not an image.");
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: responseType });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `generated-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Failed to download generated image", err);
    }
  }, [src, mediaType, extension]);

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5 text-sm text-red-400"
      >
        {errorMessage || "Image generation failed."}
      </motion.div>
    );
  }

  return (
    <>
      {src && (
        <Lightbox
          src={src}
          alt={prompt ?? "Generated image"}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{
          rotateX: springX,
          rotateY: springY,
          transformPerspective: 1000,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={revealDone ? onMouseMove : undefined}
        onMouseLeave={revealDone ? onMouseLeave : undefined}
        onClick={revealDone ? () => setLightboxOpen(true) : undefined}
        className={cn(
          "relative w-full max-w-xl aspect-square rounded-4xl overflow-hidden",
          "shadow-2xl shadow-black/20",
          "bg-white",
          revealDone && "cursor-pointer group",
        )}
      >
        {/* ── Layer 1: Generated image fades in as overlay is removed ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealDone ? 1 : 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {src && mediaType && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt={prompt ?? "Generated image"}
              onLoad={() => setImageLoaded(true)}
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>

        {/* ── Layer 2: Loading overlay (blurred placeholder + pixel anim) ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: revealDone ? 0 : 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* White background */}
          <div className="absolute inset-0 bg-white" />

          {/* Pixel animation overlay — white/ice-blue palette */}
          <div className="absolute inset-0">
            <PixelAnimation
              pixelGap={7}
              animationSpeed={0.6}
              colorHueStart={210}
              colorHueRange={18}
              maxPixelSize={4}
              animationDuration={240}
            />
          </div>




        </motion.div>

        {/* ── Layer 3: Hover info overlay (only when revealed) ── */}
        <div
          className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-250"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.28) 55%, transparent 100%)" }}
        >
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              {prompt && (
                <p className="text-[11px] text-white/90 leading-relaxed line-clamp-2 font-medium">
                  {prompt}
                </p>
              )}
              {model && (
                <span className="text-[9px] text-white/35 uppercase tracking-widest font-mono">
                  {model}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium",
                  "bg-white/12 hover:bg-white/22 text-white/90 border border-white/12",
                  "backdrop-blur-md transition-colors duration-150"
                )}
              >
                <ZoomInIcon className="size-3.5" />
              </motion.button>
              <motion.button
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                  "bg-white/12 hover:bg-white/22 text-white/90 border border-white/12",
                  "backdrop-blur-md transition-colors duration-150"
                )}
              >
                <DownloadIcon className="size-3.5" />
                Save
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Layer 4: Corner badge (fades in after generation) ── */}
        <AnimatePresence>
          {revealDone && (
            <motion.div
              className="absolute top-3 right-3"
              initial={{ opacity: 0, scale: 0.75, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            >
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium",
                "bg-black/50 text-white/50 border border-white/10 backdrop-blur-md",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )}>
                <ImageIcon className="size-2.5" />
                AI Generated
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Layer 5: Radial particle burst on first reveal ── */}
        <AnimatePresence>
          {revealDone && (
            <motion.div
              key="burst"
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-white/80"
                  style={{ width: 2.5, height: 2.5 }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i / 8) * Math.PI * 2) * 72,
                    y: Math.sin((i / 8) * Math.PI * 2) * 72,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{
                    duration: 1.0,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i * 0.03,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Named exports for backwards compatibility with gen-ui-stack.tsx
// ─────────────────────────────────────────────────────────────────────────────
export function ImageGenerationLoading({ prompt }: { prompt?: string }) {
  return <ImageGeneration prompt={prompt} />;
}

export function ImageGenerationResult(props: {
  imageId?: string;
  imageUrl?: string;
  mediaType?: string;
  prompt?: string;
  model?: string;
  error?: boolean;
  message?: string;
}) {
  return <ImageGeneration {...props} isReady />;
}
