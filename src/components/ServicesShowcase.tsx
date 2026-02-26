import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { fetchPortfolioPublic } from "@/lib/portfolio-api";
import type { PortfolioItem } from "@/lib/portfolio-types";

const FEATURED_CATEGORIES = ["Kitchens", "Bathrooms", "Flooring", "Outdoor"];
const AUTO_ROTATE_INTERVAL = 4000; // 4 seconds

interface ServiceCardProps {
  category: string;
  items: PortfolioItem[];
}

const ServiceCard = ({ category, items }: ServiceCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all images for this category (from all projects)
  const allImages = useMemo(() => {
    const images: string[] = [];
    items.forEach(item => {
      if (item.coverImage) images.push(item.coverImage);
      if (item.images && item.images.length > 0) {
        images.push(...item.images);
      }
    });
    // Remove duplicates  
    return Array.from(new Set(images)).slice(0, 6); // Limit to 6 unique images
  }, [items]);

  const currentImage = allImages[currentImageIndex] || items[0]?.coverImage;

  // Auto-rotate images
  useEffect(() => {
    if (allImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, AUTO_ROTATE_INTERVAL);

    return () => clearInterval(timer);
  }, [allImages.length]);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative overflow-hidden rounded-xl bg-white transition-all duration-300 hover:shadow-xl"
      style={{ boxShadow: "0 2px 8px rgba(15,46,77,0.12)" }}
    >
      {/* Image Container */}
      <div className="relative h-64 md:h-72 overflow-hidden bg-slate-100">
        <AnimatePresence>
          <motion.img
            key={currentImageIndex}
            src={currentImage}
            alt={`${category} project ${currentImageIndex + 1}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/aEomQEx4Q2sZ.com/media/250x165/L4iJEJBgnVg6.jpeg"; // fallback
            }}
          />
        </AnimatePresence>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Image Indicator Dots */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {allImages.slice(0, 4).map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === currentImageIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                  }`}
                aria-label={`View image ${i + 1}`}
                tabIndex={0}
              />
            ))}
          </div>
        )}

        {/* CTA Arrow */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
            <ChevronRight className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors duration-300">
          {category}
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          {items.length} project{items.length !== 1 ? "s" : ""} completed
        </p>

        {/* Image counter */}
        {allImages.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{currentImageIndex + 1}</span>
            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentImageIndex + 1) / allImages.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span>{allImages.length}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ServicesShowcase = () => {
  const [services, setServices] = useState<{ category: string; items: PortfolioItem[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const data = await fetchPortfolioPublic();
        if (data && data.items) {
          // Group items by featured categories
          const grouped = FEATURED_CATEGORIES.map(category => ({
            category,
            items: data.items.filter(item => item.category === category),
          })).filter(g => g.items.length > 0);

          setServices(grouped.length > 0 ? grouped : []);
        }
      } catch (error) {
        console.error("Failed to load services:", error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  if (loading) {
    return (
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-6 bg-white relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h2
            className="font-semibold text-slate-900 tracking-tight mb-2"
            style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            Our Services
          </h2>
          <p className="text-slate-600 text-lg">
            Transforming homes across multiple service categories with quality craftsmanship
          </p>
        </motion.div>

        {services.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard
                key={service.category}
                category={service.category}
                items={service.items}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600">No services available at this time.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesShowcase;
