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
  intervalMs = 3000,
  className = "w-full h-full object-cover",
  onClick
}) => {
  // Combine real project photos first, followed by primaryImage as fallback
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    
    if (Array.isArray(additionalPhotos)) {
      additionalPhotos.forEach(p => {
        if (p && typeof p === "string" && p.trim() && !list.includes(p.trim())) {
          list.push(p.trim());
        }
      });
    }

    if (primaryImage && typeof primaryImage === "string" && primaryImage.trim() && !list.includes(primaryImage.trim())) {
      list.push(primaryImage.trim());
    }

    return list;
  }, [primaryImage, additionalPhotos]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Continuous auto-play slideshow transition every ~3 seconds
  useEffect(() => {
    if (allImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % allImages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [allImages.length, intervalMs]);

  if (allImages.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-md">
          <Home className="w-5 h-5 text-amber-400" />
        </div>
        <h4 className="text-sm font-bold text-white tracking-tight leading-snug">{title}</h4>
        <span className="text-[10px] text-amber-400/90 font-semibold uppercase tracking-wider mt-1">H &amp; A Construction</span>
      </div>
    );
  }

  if (allImages.length === 1) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center z-0">
          <Home className="w-6 h-6 text-amber-400 mb-1" />
          <span className="text-xs font-bold text-white">{title}</span>
        </div>
        <img
          src={allImages[0]}
          alt={`${title} photo`}
          className={`${className} relative z-10 transition-opacity duration-500`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.opacity = "0";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-slate-900 group"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center z-0">
        <Home className="w-6 h-6 text-amber-400 mb-1" />
        <span className="text-xs font-bold text-white">{title}</span>
      </div>

      {allImages.map((imgUrl, idx) => (
        <img
          key={`${imgUrl}-${idx}`}
          src={imgUrl}
          alt={`${title} photo ${idx + 1}`}
          style={{ transition: "opacity 800ms ease-in-out, transform 800ms ease-in-out" }}
          className={`${className} absolute inset-0 ${
            idx === currentIndex ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105 pointer-events-none"
          }`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.opacity = "0";
          }}
        />
      ))}

      {/* Real Photos Count Badge */}
      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-white border border-white/20 shadow-md">
        <ImageIcon className="w-3 h-3 text-amber-400" />
        <span>
          {currentIndex + 1} / {allImages.length}
        </span>
      </div>

      {/* Slide Progress Dots Indicator */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-xs">
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
