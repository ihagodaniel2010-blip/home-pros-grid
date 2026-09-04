import React, { useState, useEffect } from "react";
import { Star, ExternalLink, MessageSquarePlus } from "lucide-react";
import { siteConfig } from "@/config/site";

interface GoogleReviewItem {
  authorName: string;
  authorPhotoUri?: string;
  authorUri?: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
  publishTime?: string;
}

interface ReviewsApiResponse {
  configured: boolean;
  businessName?: string;
  rating: number | null;
  userRatingCount: number | null;
  reviews: GoogleReviewItem[];
  googleMapsUri?: string;
}

export default function GoogleReviewsSection() {
  const [data, setData] = useState<ReviewsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const businessUrl = (process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL || siteConfig.googleReviewsUrl || "").trim();
  const writeUrl = (process.env.NEXT_PUBLIC_GOOGLE_REVIEW_WRITE_URL || "").trim();

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.warn("Could not load Google reviews from API:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReviews();
  }, []);

  const hasPublicLinks = Boolean(businessUrl || writeUrl);
  const isApiActive = Boolean(data?.configured && data.rating && data.reviews && data.reviews.length > 0);

  // If neither API nor public links are available, hide section completely
  if (!isLoading && !isApiActive && !hasPublicLinks) {
    return null;
  }

  return (
    <section className="py-16 bg-slate-900 text-white border-t border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">

        {/* Section Header */}
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 text-sky-400 rounded-full text-xs font-bold uppercase tracking-wider border border-sky-500/20">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.987 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
            Verified Google Reviews
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            What Our Customers Say
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            Read verified customer feedback from our Google Business Profile.
          </p>

          {/* Rating Summary (Only rendered if API returned real stats) */}
          {isApiActive && data?.rating && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <span className="text-3xl font-extrabold text-white">{data.rating}</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(data.rating || 5)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-600 fill-slate-700"
                    }`}
                  />
                ))}
              </div>
              {data.userRatingCount && (
                <span className="text-xs text-slate-400 font-medium">
                  ({data.userRatingCount} reviews on Google)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Real Reviews Cards (Up to 3 on Homepage) */}
        {isApiActive && data?.reviews && data.reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {data.reviews.slice(0, 3).map((review, idx) => (
              <div
                key={idx}
                className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {review.authorPhotoUri ? (
                        <img
                          src={review.authorPhotoUri}
                          alt={review.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-600"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-sm border border-slate-600">
                          {review.authorName[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-white">{review.authorName}</p>
                        <p className="text-xs text-slate-400">{review.relativePublishTimeDescription}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed line-clamp-4">
                    "{review.text}"
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 fill-current text-sky-400" viewBox="0 0 24 24">
                      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.987 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                    </svg>
                    Google Review
                  </span>
                  {review.authorUri && (
                    <a
                      href={review.authorUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {businessUrl && (
            <a
              href={businessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <span>Read All Reviews on Google</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {writeUrl && (
            <a
              href={writeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4 text-sky-400" />
              <span>Leave Us a Google Review</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
