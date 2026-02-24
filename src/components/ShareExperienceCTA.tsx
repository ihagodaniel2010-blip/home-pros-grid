import { motion } from "framer-motion";
import { Star, MessageSquare, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

interface ShareExperienceCTAProps {
  onLoginClick?: () => void;
}

const ShareExperienceCTA = ({ onLoginClick }: ShareExperienceCTAProps) => {
  const { user } = useUser();
  const navigate = useNavigate();

  // Don't show CTA if user is logged in and eligible
  if (user && user.completedJobId) {
    return null;
  }

  // Show eligibility message if logged in but not eligible
  if (user && !user.completedJobId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-16"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 border-2 border-amber-200 rounded-2xl mb-6">
            <AlertCircle className="text-amber-600" size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Review Eligibility
          </h3>
          <p className="text-gray-600 max-w-xl mx-auto">
            Only customers with completed jobs can leave reviews. Complete a job through Barrigudo to share your experience.
          </p>
        </div>
      </motion.div>
    );
  }

  const handleClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      navigate("/login");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-16"
    >
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-8 md:p-12 text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-gray-200 rounded-2xl mb-6 shadow-sm"
        >
          <MessageSquare className="text-gray-700" size={28} />
        </motion.div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Share Your Experience
        </h2>
        
        {/* Description */}
        <p className="text-gray-600 max-w-xl mx-auto mb-8">
          Sign in with Google to leave a review and help other homeowners discover trusted professionals.
        </p>

        {/* CTA Button */}
        <Button
          onClick={handleClick}
          size="lg"
          className="bg-gray-900 text-white hover:bg-gray-800 px-8 py-6 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <Star className="mr-2" size={20} />
          Write a Review
        </Button>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 mt-6">
          Your review will be verified and published immediately
        </p>
      </div>
    </motion.div>
  );
};

export default ShareExperienceCTA;
