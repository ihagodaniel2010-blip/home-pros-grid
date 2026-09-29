import React, { useState, useEffect } from "react";
import { Home, Image as ImageIcon } from "lucide-react";

export interface CardPhotoCarouselProps {
  primaryImage?: string | null;
  additionalPhotos?: string[];
  title: string;
  intervalMs?: number;
  className?: string;
  onClick?: () => void;
}

export const CardPhotoCarousel: React.FC<CardPhotoCarouselProps> = ({
  primaryImage,
  additionalPhotos = [],
  title,
  intervalMs = 3500,
  className = "w-full h-full object-cover",
  onClick
}) => {
  // Deduplicate and filter valid photo URLs
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (primaryImage && typeof primaryImage === "string" && primaryImage.trim()) {
      list.push(primaryImage.trim());
    }
    if (Array.isArray(additionalPhotos)) {
      additionalPhotos.forEach(p => {
        if (p && typeof p === "string" && p.trim() && !list.includes(p.trim())) {
          list.push(p.trim());
        }
      });
    }
    return list;
  }, [primaryImage, additionalPhotos]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play slideshow transition when there are multiple photos
  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % allImages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [allImages.length, intervalMs, isPaused]);

  if (allImages.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-md">
          <Home className="w-5 h-5 text-amber-400" />
        </div>
        <h4 className="text-sm font-bold text-white tracking-tight leading-snug">{title}</h4>
      </div>
    );
  }

  if (allImages.length === 1) {
    return (
      <img
        src={allImages[0]}
        alt={`${title} photo`}
        className={className}
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={onClick}
    >
      {allImages.map((imgUrl, idx) => (
        <img
          key={`${imgUrl}-${idx}`}
          src={imgUrl}
          alt={`${title} photo ${idx + 1}`}
          className={`${className} absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === currentIndex ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105 pointer-events-none"
          } group-hover:scale-105 transition-transform duration-500`}
          loading="lazy"
        />
      ))}

      {/* Counter Badge & Progress Dots */}
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
        <ImageIcon className="w-3 h-3 text-amber-400" />
        <span>
          {currentIndex + 1} / {allImages.length}
        </span>
      </div>

      {/* Progress Dots Indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-xs">
        {allImages.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "w-4 bg-amber-400" : "w-1.5 bg-white/50 hover:bg-white"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
