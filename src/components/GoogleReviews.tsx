import React from "react";
import { Star, ExternalLink } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * Developer Note:
 * This Google Reviews component is optional and clean.
 * Configure the official Google Business Profile review link by setting
 * NEXT_PUBLIC_GOOGLE_REVIEWS_URL in environment variables (Vercel / .env).
 * Example: NEXT_PUBLIC_GOOGLE_REVIEWS_URL="https://g.page/r/your-google-business-profile-link/review"
 *
 * If NEXT_PUBLIC_GOOGLE_REVIEWS_URL is empty or not configured, this section automatically hides completely.
 * It does NOT display fake stars, fake rating numbers, fake review counts, or hardcoded client quotes.
 */
export default function GoogleReviews() {
  const googleReviewsUrl = siteConfig.googleReviewsUrl?.trim();

  // If no valid Google Reviews URL is configured, hide the section completely.
  if (!googleReviewsUrl || googleReviewsUrl === "#" || googleReviewsUrl === "") {
    return null;
  }

  return (
    <section className="py-12 bg-slate-50 border-t border-b border-slate-200/60">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
          Client Feedback & Verified Reviews
        </h2>
        <p className="text-sm text-slate-600 mb-6 max-w-xl mx-auto font-medium">
          See what homeowners in Saco, Old Orchard Beach, Biddeford, Scarborough, and Southern Maine say about H & A Construction LLC.
        </p>

        <a
          href={googleReviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
          <span>Read Our Reviews on Google</span>
          <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
        </a>
      </div>
    </section>
  );
}
