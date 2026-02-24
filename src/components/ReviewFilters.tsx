import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface ReviewFiltersProps {
  selectedRating?: number;
  onRatingChange?: (rating: number | undefined) => void;
  sortBy?: "newest" | "highest";
  onSortChange?: (sort: "newest" | "highest") => void;
}

const ReviewFilters = ({
  selectedRating,
  onRatingChange,
  sortBy = "newest",
  onSortChange,
}: ReviewFiltersProps) => {
  const ratingOptions = [
    { value: undefined, label: "All" },
    { value: 5, label: "5★", count: 5 },
    { value: 4, label: "4★", count: 4 },
    { value: 3, label: "3★", count: 3 },
    { value: 2, label: "2★", count: 2 },
    { value: 1, label: "1★", count: 1 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8"
    >
      {/* Rating Pills */}
      <div className="flex flex-wrap gap-2">
        {ratingOptions.map((option, idx) => (
          <motion.button
            key={option.value ?? "all"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onRatingChange?.(option.value)}
            className={`px-4 py-2 rounded-full font-medium transition-all duration-200 border-2 ${
              selectedRating === option.value
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-lg shadow-blue-200"
                : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {option.label}
              {option.value && (
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
              )}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Sort Dropdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <label className="hidden sm:flex items-center text-sm font-medium text-slate-700">
          Sort by:
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange?.(e.target.value as "newest" | "highest")}
          className="px-4 py-2 bg-white border-2 border-slate-300 rounded-lg font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
        >
          <option value="newest">Newest</option>
          <option value="highest">Highest Rating</option>
        </select>
      </motion.div>
    </motion.div>
  );
};

export default ReviewFilters;
