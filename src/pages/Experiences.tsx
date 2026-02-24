import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle, MessageCircle } from "lucide-react";
import Layout from "@/components/Layout";
import RatingSummary from "@/components/RatingSummary";
import ReviewFilters from "@/components/ReviewFilters";
import ReviewCard from "@/components/ReviewCard";
import ShareExperienceCTA from "@/components/ShareExperienceCTA";
import { Button } from "@/components/ui/button";
import { reviewsService } from "@/lib/reviewsService";
import { Review } from "@/types/reviews";

const Experiences = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<"newest" | "highest">("newest");
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      try {
        const allReviews = await reviewsService.getReviews({
          limit: 999, // get all for filtering
        });
        setReviews(allReviews);
        setOffset(0);
      } finally {
        setIsLoading(false);
      }
    };
    loadReviews();
  }, []);

  // Filter and sort
  useEffect(() => {
    let filtered = reviews;

    // Apply rating filter
    if (selectedRating) {
      filtered = filtered.filter((r) => r.rating === selectedRating);
    }

    // Apply sorting
    if (sortBy === "highest") {
      filtered.sort((a, b) => b.rating - a.rating || b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    setFilteredReviews(filtered.slice(0, 6 + offset * 6));
  }, [reviews, selectedRating, sortBy, offset]);

  const handleLoadMore = () => {
    setOffset(offset + 1);
  };

  const handleRatingClick = (rating: number | undefined) => {
    setSelectedRating(rating);
    setOffset(0);
  };

  const handleSortChange = (sort: "newest" | "highest") => {
    setSortBy(sort);
    setOffset(0);
  };

  return (
    <Layout>
      {/* Hero Section - Clean Premium */}
      <section className="relative bg-gradient-to-b from-gray-50 to-white py-16 px-6 border-b border-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Client Experiences
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Real reviews from real homeowners. Discover why families trust Barrigudo to connect them with the best home professionals.
          </p>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-8 bg-white border border-gray-200 rounded-2xl px-8 py-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className="fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span className="text-2xl font-bold text-gray-900">4.8</span>
            </div>
            
            <div className="w-px h-10 bg-gray-200" />
            
            <div className="text-left">
              <div className="text-2xl font-bold text-gray-900">5,000+</div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>

            <div className="w-px h-10 bg-gray-200" />

            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600" size={20} />
              <span className="text-sm font-medium text-gray-700">Verified by Google</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Main Content Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto">
          {/* Rating Summary */}
          <RatingSummary onStarFilterClick={handleRatingClick} selectedRating={selectedRating} />

          {/* Filters */}
          <ReviewFilters
            selectedRating={selectedRating}
            onRatingChange={handleRatingClick}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />

          {/* Reviews List */}
          {isLoading ? (
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse h-32"
                />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <MessageCircle className="mx-auto mb-4 text-slate-400" size={48} />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {selectedRating
                  ? `No ${selectedRating}-star reviews yet`
                  : "No reviews yet"}
              </h3>
              <p className="text-slate-600">
                Be the first to share your Barrigudo experience with the community.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="grid gap-6">
                <AnimatePresence>
                  {filteredReviews.map((review, idx) => (
                    <ReviewCard key={review.id} review={review} index={idx} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More Button */}
              {reviews.length > 6 + offset * 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-12"
                >
                  <Button
                    onClick={handleLoadMore}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Load More Reviews
                  </Button>
                </motion.div>
              )}
            </>
          )}

          {/* Share Experience CTA */}
          <ShareExperienceCTA />
        </div>
      </section>
    </Layout>
  );
};

export default Experiences;
