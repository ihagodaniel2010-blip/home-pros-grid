import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewsService } from "@/lib/reviewsService";
import { Review, ReviewsStats } from "@/types/reviews";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";

type SortType = "newest" | "highest";

const ClientReviews = () => {
  const { user } = useUser();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewsStats>({
    avgRating: 0,
    totalReviews: 0,
    ratingDistribution: {},
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  // Filters & Sorting
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<SortType>("newest");
  const [offset, setOffset] = useState(0);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formBody, setFormBody] = useState("");

  // Load initial reviews
  useEffect(() => {
    const loadReviews = async () => {
      setIsLoadingReviews(true);
      try {
        const data = await reviewsService.getReviews({
          rating: filterRating,
          sort: sortBy,
          limit: 6,
          offset: 0,
        });
        setReviews(data);
        setOffset(0);
      } finally {
        setIsLoadingReviews(false);
      }
    };
    loadReviews();
  }, [filterRating, sortBy]);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      const data = await reviewsService.getStats();
      setStats(data);
    };
    loadStats();
  }, [reviews]);

  const handleLoadMore = async () => {
    const nextOffset = offset + 6;
    const moreData = await reviewsService.getReviews({
      rating: filterRating,
      sort: sortBy,
      limit: 6,
      offset: nextOffset,
    });
    setReviews([...reviews, ...moreData]);
    setOffset(nextOffset);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in with Google to post a review.",
      });
      return;
    }

    if (!formBody.trim()) {
      toast({
        title: "Review text required",
        description: "Please write something in your review.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newReview = await reviewsService.addReview({
        userName: user.name,
        userAvatarUrl: user.avatarUrl,
        rating: formRating,
        body: formBody,
      });

      // Reload reviews
      const data = await reviewsService.getReviews({
        rating: filterRating,
        sort: sortBy,
        limit: 6,
        offset: 0,
      });
      setReviews(data);
      setOffset(0);

      // Reload stats
      const newStats = await reviewsService.getStats();
      setStats(newStats);

      // Clear form and show toast
      setFormRating(5);
      setFormBody("");
      toast({
        title: "Thank you!",
        description: "Your review has been posted.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Client Reviews</h2>
          <p className="text-lg text-slate-600">
            Real experiences from homeowners we've served.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12 bg-white rounded-2xl shadow-lg p-8 border border-slate-100"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-slate-900">{stats.avgRating}</span>
                <span className="text-2xl text-slate-600">/5</span>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < Math.floor(stats.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}
                  />
                ))}
              </div>
            </div>

            {/* Total Reviews */}
            <div className="text-center sm:text-left">
              <div className="text-sm text-slate-600">Based on</div>
              <div className="text-3xl font-bold text-slate-900">{stats.totalReviews}</div>
              <div className="text-sm text-slate-600">Reviews</div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="highest">Highest Rating</option>
              </select>

              {/* Rating Filter */}
              <select
                value={filterRating || ""}
                onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : undefined)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 stars)</option>
                <option value="3">⭐⭐⭐ (3 stars)</option>
                <option value="2">⭐⭐ (2 stars)</option>
                <option value="1">⭐ (1 star)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Submit Review Form (if logged in) */}
        {user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-8 border border-blue-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
              />
              <div>
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-600">via Google</p>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Rating Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormRating(rating)}
                      className="group"
                    >
                      <Star
                        size={24}
                        className={`transition-all cursor-pointer ${
                          rating <= formRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-300 group-hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Your Review</label>
                <Textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Share your experience with our services..."
                  className="min-h-24 border-slate-300 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
              >
                {isSubmitting ? "Posting..." : "Post Review"}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700 text-center"
          >
            <LogIn className="mx-auto mb-4 text-slate-400" size={32} />
            <h3 className="text-xl font-semibold text-white mb-2">Share Your Experience</h3>
            <p className="text-slate-400 mb-6">Sign in with Google to leave a review</p>
            <Button
              disabled
              className="bg-slate-700 text-slate-400 cursor-not-allowed"
            >
              Continue with Google (Coming soon)
            </Button>
          </motion.div>
        )}

        {/* Reviews List */}
        {isLoadingReviews ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto mb-4 text-slate-400" size={48} />
            <p className="text-slate-600">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              <AnimatePresence>
                {reviews.map((review, idx) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-slate-100"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={review.userAvatarUrl}
                          alt={review.userName}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{review.userName}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-slate-300"
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded-full">
                              via Google
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>

                    {/* Body */}
                    <p className="text-slate-700 leading-relaxed line-clamp-3">
                      {review.body}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load More Button */}
            {reviews.length >= 6 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="border-slate-300 text-slate-900 hover:bg-slate-50"
                >
                  Load More Reviews
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ClientReviews;
