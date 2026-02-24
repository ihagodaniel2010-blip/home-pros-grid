import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Review } from "@/types/reviews";

interface ReviewCardProps {
  review: Review;
  index?: number;
}

const ReviewCard = ({ review, index = 0 }: ReviewCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-150 shadow-md hover:shadow-xl transition-all p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 + 0.1 }}
            className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white shadow-md"
          >
            {review.userAvatarUrl && review.userAvatarUrl.includes("dicebear") ? (
              <img
                src={review.userAvatarUrl}
                alt={review.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {getInitials(review.userName)}
              </div>
            )}
          </motion.div>

          {/* Name & Badge */}
          <div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.15 }}
              className="font-semibold text-slate-900"
            >
              {review.userName}
            </motion.h3>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.2 }}
              className="flex items-center gap-2 mt-0.5"
            >
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium border border-blue-200">
                via Google
              </span>
            </motion.div>
          </div>
        </div>

        {/* Date */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.1 }}
          className="text-xs text-slate-500 font-medium"
        >
          {formatDate(review.createdAt)}
        </motion.span>
      </div>

      {/* Rating */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.05 + 0.25 }}
        className="flex gap-1 mb-3"
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.05 + 0.3 + i * 0.05,
              type: "spring",
              stiffness: 100,
            }}
          >
            <Star
              size={16}
              className={
                i < review.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-slate-200 text-slate-200"
              }
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Body */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.05 + 0.4 }}
        className="text-slate-700 leading-relaxed text-sm line-clamp-4 hover:line-clamp-none transition-all"
      >
        {review.body}
      </motion.p>
    </motion.div>
  );
};

export default ReviewCard;
