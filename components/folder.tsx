"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThumbnailCarousel, type CarouselImage } from "@/components/ui/framer-thumbnail-carousel";

// Placeholder gradient colours shown while images are loading or when none exist
const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
];

function PlaceholderImage({
  gradient,
  className,
}: {
  gradient: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ background: gradient }}
    />
  );
}

export function Folder() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchImages = () => {
    setIsFetching(true);
    fetch("/api/images/list")
      .then((r) => r.json())
      .then((data: { images: CarouselImage[] }) => {
        setImages(data.images ?? []);
      })
      .catch((err) => {
        console.error("[Folder] Failed to fetch blob images:", err);
      })
      .finally(() => setIsFetching(false));
  };

  // Fetch on mount so previews are ready
  useEffect(() => {
    fetchImages();
  }, []);

  const handleClick = () => {
    // Refresh images from Blob every time the folder is opened
    fetchImages();
    setIsGalleryOpen(true);
  };

  // Pick up to 3 preview images (or fall back to placeholders)
  const preview = images.slice(0, 3);

  const previewSrc = (i: number): string | undefined => preview[i]?.url;

  return (
    <>
      <div className="relative w-[306px] h-[306px] bg-white/20 backdrop-blur-xl border border-white/10 rounded-[25px] flex items-center justify-center overflow-visible" onClick={handleClick}>
        <motion.div
          className="relative w-full h-full group cursor-pointer scale-[0.8]"
          initial="initial"
          whileHover="hover"
          style={{ perspective: 1000 }}
        >
          {/* Back of the folder */}
          <div className="absolute inset-[25.31%_0.02%_0.01%_0]">
            <svg className="absolute block max-w-none size-full" viewBox="0 0 242 181" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.8225 168.555C8.22688 161.103 -1.54143 20.5887 0.208443 12.6807C1.95831 4.77282 4.42469 1.91628 12.3388 0.550413C20.2528 -0.815457 82.1021 0.825267 87.5468 0.550413C92.9915 0.275559 91.8872 0.550415 96.7393 0.550405L115.238 0.5504L130.098 0.550413C138.589 0.550413 216.841 1.23883 227.14 3.03258C237.44 4.82633 240.413 31.8574 241.299 44.5229C242.185 57.1883 232.706 157.249 230.988 165.523C229.27 173.796 226.263 177.168 214.915 179.473C203.567 181.777 30.5147 180.344 23.2561 179.473C15.9975 178.602 13.4181 176.008 10.8225 168.555Z" fill="#FDEFE4"/>
            </svg>
          </div>

          {/* Images inside the folder */}
          <div className="absolute inset-[0_1.3%_34.84%_1.51%]">
            {/* Right Image */}
            <motion.div
              className="absolute aspect-[210.40305470196972/257.00852996931644] flex items-center justify-center left-[45.84%] right-[1.3%] top-[2.99px]"
              variants={{
                initial: { y: 0, x: 0, rotate: 0 },
                hover: { y: -40, x: 20, rotate: 5 },
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-none h-[221.717px] rotate-[18.12deg] w-[148.824px]">
                <div className="relative rounded-[18.577px] size-full shadow-lg overflow-hidden">
                  {previewSrc(2) ? (
                    <img alt={preview[2]?.title ?? 'Gallery preview'} className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[18.577px] size-full" src={previewSrc(2)} />
                  ) : (
                    <PlaceholderImage gradient={PLACEHOLDER_GRADIENTS[2]} className="absolute inset-0 size-full rounded-[18.577px]" />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Center Image */}
            <motion.div
              className="absolute left-1/2 top-[2.99px] -translate-x-1/2 z-0"
              variants={{
                initial: { y: 0 },
                hover: { y: -60 },
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="h-[221.717px] w-[148.824px]">
                <div className="relative size-full overflow-hidden rounded-[18.286px] shadow-lg">
                  {previewSrc(1) ? (
                    <img alt={preview[1]?.title ?? 'Gallery preview'} className="absolute inset-0 size-full object-cover pointer-events-none" src={previewSrc(1)} />
                  ) : (
                    <PlaceholderImage gradient={PLACEHOLDER_GRADIENTS[1]} className="absolute inset-0 size-full" />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Left Image */}
            <motion.div
              className="absolute z-20 aspect-[210.3080919542299/259.55718047904156] flex items-center justify-center left-[1.51%] right-[45.65%] top-0"
              variants={{
                initial: { y: 0, x: 0, rotate: 0 },
                hover: { y: -40, x: -20, rotate: -5 },
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-none h-[225.095px] rotate-[-17.28deg] w-[150.234px]">
                <div className="relative rounded-[19.176px] size-full shadow-lg overflow-hidden">
                  {previewSrc(0) ? (
                    <img alt={preview[0]?.title ?? 'Gallery preview'} className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[19.176px] size-full" src={previewSrc(0)} />
                  ) : (
                    <PlaceholderImage gradient={PLACEHOLDER_GRADIENTS[0]} className="absolute inset-0 size-full rounded-[19.176px]" />
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Front of the folder */}
          <motion.div
            className="absolute inset-[30.83%_0_0_0] z-20 origin-bottom"
            variants={{
              initial: { rotateX: 0 },
              hover: { rotateX: -15 },
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="absolute inset-[-0.72%_-0.5%] overflow-hidden rounded-xl">
              <svg className="block max-w-none size-full" viewBox="0 0 244 170" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.42136 12.9591C-0.328771 20.2841 9.44102 150.441 12.037 157.345C14.633 164.248 17.2128 166.65 24.4725 167.457C31.7322 168.264 204.811 169.592 216.161 167.457C227.51 165.323 230.518 162.199 232.236 154.535C233.954 146.872 243.434 54.1861 242.548 42.4542C241.662 30.7223 237.987 27.5423 227.686 25.8808C217.385 24.2192 137.605 25.8808 129.112 25.8808C120.62 25.8808 116.353 22.5375 111.521 15.2063C106.689 7.87522 104.854 7.65255 100.905 4.81285C96.9567 1.97314 94.2184 1.46829 88.7729 1.72289C83.3274 1.97748 21.4688 0.457692 13.5535 1.72289C5.63825 2.98808 3.1715 5.63407 1.42136 12.9591Z" fill="#DADEDF" fillOpacity="0.2" stroke="#FDEFE4" strokeWidth="2.42607"/>
                <path d="M52.7666 137.679H195.904M52.7666 146.17H195.904" stroke="#322D31" strokeOpacity="0.85" strokeWidth="2.42607"/>
              </svg>

              {/* Subtle shine effect removed */}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="bg-white/20! backdrop-blur-3xl border border-white/40 p-5 w-fit max-w-none sm:max-w-none gap-4 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-[2rem]!">
          <DialogHeader className="px-1">
            <DialogTitle className="text-gray-800 text-sm font-semibold tracking-wide drop-shadow-sm">
              Image Gallery {images.length > 0 && `(${images.length})`}
            </DialogTitle>
          </DialogHeader>
          <ThumbnailCarousel images={images} />
        </DialogContent>
      </Dialog>
    </>
  );
}
