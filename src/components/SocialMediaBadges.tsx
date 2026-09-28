import React from "react";

export interface SocialMediaBadgesProps {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  facebookEnabled?: boolean;
  instagramEnabled?: boolean;
  tiktokEnabled?: boolean;
  youtubeEnabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SocialMediaBadges: React.FC<SocialMediaBadgesProps> = ({
  facebookUrl = "https://www.facebook.com/",
  instagramUrl = "https://www.instagram.com/h.a_construction/",
  tiktokUrl = "https://www.tiktok.com/",
  youtubeUrl = "https://www.youtube.com/",
  facebookEnabled = true,
  instagramEnabled = true,
  tiktokEnabled = true,
  youtubeEnabled = true,
  size = "md",
  className = ""
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-11 h-11"
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Instagram */}
      {instagramEnabled && (
        <a
          href={instagramUrl || "https://www.instagram.com/h.a_construction/"}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClasses} rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg hover:brightness-110 ring-2 ring-white/10`}
          title="Follow us on Instagram"
          aria-label="Instagram"
        >
          <svg className={`${iconSizes} fill-current`} viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
      )}

      {/* Facebook */}
      {facebookEnabled && (
        <a
          href={facebookUrl || "https://www.facebook.com/"}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClasses} rounded-full bg-[#1877F2] text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg hover:bg-[#166fe5] ring-2 ring-white/10`}
          title="Follow us on Facebook"
          aria-label="Facebook"
        >
          <svg className={`${iconSizes} fill-current`} viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
      )}

      {/* YouTube */}
      {youtubeEnabled && (
        <a
          href={youtubeUrl || "https://www.youtube.com/"}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClasses} rounded-full bg-[#FF0000] text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg hover:bg-[#e60000] ring-2 ring-white/10`}
          title="Subscribe on YouTube"
          aria-label="YouTube"
        >
          <svg className={`${iconSizes} fill-current`} viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
      )}

      {/* TikTok */}
      {tiktokEnabled && (
        <a
          href={tiktokUrl || "https://www.tiktok.com/"}
          target="_blank"
          rel="noopener noreferrer"
          className={`${sizeClasses} rounded-full bg-[#000000] text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md hover:shadow-lg hover:bg-slate-900 border border-slate-700/80 ring-2 ring-white/10`}
          title="Follow us on TikTok"
          aria-label="TikTok"
        >
          <svg className={`${iconSizes} fill-current`} viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.52c0 1.94-.53 3.82-1.66 5.34-1.89 2.55-5.27 3.63-8.32 2.76-3.32-.95-5.74-3.93-5.77-7.39-.03-3.69 2.58-6.93 6.19-7.46 1.05-.15 2.13-.04 3.14.33v4.13c-.64-.26-1.35-.35-2.04-.26-1.44.18-2.67 1.25-3.03 2.66-.46 1.8.69 3.67 2.52 4.07 1.66.36 3.39-.42 4.1-1.95.27-.58.39-1.22.38-1.86V.02z"/>
          </svg>
        </a>
      )}
    </div>
  );
};
