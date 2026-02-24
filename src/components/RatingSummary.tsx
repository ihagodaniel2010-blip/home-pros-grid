import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { reviewsService } from "@/lib/reviewsService";
import { ReviewsStats } from "@/types/reviews";

interface RatingSummaryProps {
  onStarFilterClick?: (rating: number | undefined) => void;
  selectedRating?: number;
}

const RatingSummary = ({ onStarFilterClick, selectedRating }: RatingSummaryProps) => {
  const [stats, setStats] = useState<ReviewsStats>({
    avgRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await reviewsService.getStats();
        setStats(data);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  if (isLoading) {
    return <div className="bg-white rounded-2xl p-6 animate-pulse h-32 border border-gray-100" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8"
    >
      <div className="flex items-center justify-between">
        {/* Left: Average Rating */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="text-5xl font-bold text-gray-900">
              {stats.totalReviews === 0 ? "0.0" : stats.avgRating.toFixed(1)}
            </div>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={
                    i < Math.round(stats.avgRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
          </div>

          <div className="h-16 w-px bg-gray-200" />

          <div>
            <p className="text-sm text-gray-600">
              Based on <span className="font-semibold text-gray-900">{stats.totalReviews}</span> reviews
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalReviews === 0
                ? "Be the first to review"
                : stats.avgRating >= 4.5
                ? "Excellent satisfaction rate"
                : stats.avgRating >= 4
                ? "Great customer experiences"
                : "Good service quality"}
            </p>
          </div>
        </div>

        {/* Right: Quick Distribution Buttons */}
        {stats.totalReviews > 0 && (
          <div className="flex items-center gap-2">
            {[5, 4, 3].map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              if (count === 0) return null;
              
              return (
                <button
                  key={rating}
                  onClick={() => onStarFilterClick?.(rating)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedRating === rating
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {rating}★ ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RatingSummary;
