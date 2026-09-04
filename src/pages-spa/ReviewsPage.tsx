import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";
import { Star, ExternalLink, MessageSquarePlus, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const businessUrl = (process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL || siteConfig.googleReviewsUrl || "").trim();
  const writeUrl = (process.env.NEXT_PUBLIC_GOOGLE_REVIEW_WRITE_URL || "").trim();

  useEffect(() => {
    document.title = `Google Reviews | ${siteConfig.businessName}`;

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

  const isApiActive = Boolean(data?.configured && data.rating && data.reviews && data.reviews.length > 0);

  return (
    <Layout>
      {/* Banner Header */}
      <div className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 text-sky-400 rounded-full text-xs font-bold uppercase tracking-wider border border-sky-500/20">
            <ShieldCheck className="w-4 h-4 text-sky-400" /> Verified Customer Feedback
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Featured Reviews from Our Google Business Profile
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Discover real experiences from homeowners in Saco, Old Orchard Beach, Biddeford, Scarborough, and Southern Maine.
          </p>

          {/* Rating Summary (Only displayed when real API data is available) */}
          {isApiActive && data?.rating && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 flex items-center gap-4">
                <span className="text-4xl font-extrabold text-white">{data.rating}</span>
                <div>
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
                    <p className="text-xs text-slate-400 font-medium text-left mt-0.5">
                      Based on {data.userRatingCount} verified Google reviews
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Reviews Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">

        {/* Featured Reviews List */}
        {isApiActive && data?.reviews && data.reviews.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Google Customer Reviews</h2>
              <span className="text-xs text-slate-500 italic">
                Showing top featured reviews from Google Places API
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {review.authorPhotoUri ? (
                          <img
                            src={review.authorPhotoUri}
                            alt={review.authorName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                            {review.authorName[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-slate-900">{review.authorName}</p>
                          <p className="text-xs text-slate-500">{review.relativePublishTimeDescription}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-slate-700 text-sm leading-relaxed">
                      "{review.text}"
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Verified Google Review</span>
                    {review.authorUri && (
                      <a
                        href={review.authorUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Clean Fallback when API key is unconfigured */
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.987 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google Business Profile Reviews</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We collect and display all customer ratings directly on our official Google Business Profile. Visit Google Maps to read full customer stories or leave your feedback.
            </p>
          </div>
        )}

        {/* Action Buttons Section */}
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Want to see all reviews or write your own?</h3>
            <p className="text-slate-600 text-sm mt-1">
              Google Places API provides featured highlights. Visit our full profile to view every review.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            {businessUrl && (
              <a
                href={businessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs sm:text-sm flex items-center gap-2"
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
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all text-xs sm:text-sm flex items-center gap-2"
              >
                <MessageSquarePlus className="w-4 h-4 text-sky-400" />
                <span>Leave Us a Google Review</span>
              </a>
            )}
          </div>
        </div>

        {/* Final CTA: Project Estimate Request */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ready to Start Your Construction Project?</h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Get a professional, transparent estimate for carpentry, remodeling, painting, flooring, roofing, or home improvement in Southern Maine.
          </p>
          <div className="pt-2">
            <Link
              to="/quote/remodeling"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md transition-all text-sm"
            >
              <span>Get Your Free Estimate</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
