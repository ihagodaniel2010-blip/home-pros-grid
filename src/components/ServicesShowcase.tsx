import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Maximize2, X, Image as ImageIcon, Film } from "lucide-react";
import { fetchPortfolioPublic } from "@/lib/portfolio-api";
import { getPublicPortfolioShowcase, PublicPortfolioShowcaseItem } from "@/lib/job-media";
import type { PortfolioItem } from "@/lib/portfolio-types";

const FEATURED_CATEGORIES = ["Kitchens", "Bathrooms", "Flooring", "Outdoor"];
const AUTO_ROTATE_INTERVAL = 4000;

interface ServiceCardProps {
  category: string;
  items: PortfolioItem[];
}

const ServiceCard = ({ category, items }: ServiceCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allImages = useMemo(() => {
    const images: string[] = [];
    items.forEach(item => {
      if (item.coverImage) images.push(item.coverImage);
      if (item.images && item.images.length > 0) {
        images.push(...item.images);
      }
    });
    return Array.from(new Set(images)).slice(0, 6);
  }, [items]);

  const currentImage = allImages[currentImageIndex] || items[0]?.coverImage;

  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, AUTO_ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [allImages.length]);

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
              target.style.display = 'none';
            }}
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {allImages.slice(0, 4).map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === currentImageIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"}`}
                aria-label={`View image ${i + 1}`}
                tabIndex={0}
              />
            ))}
          </div>
        )}

        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
            <ChevronRight className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors duration-300">
          {category}
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          {items.length} project{items.length !== 1 ? "s" : ""} completed
        </p>
      </div>
    </motion.div>
  );
};

const ServicesShowcase = () => {
  const [portfolioItems, setPortfolioItems] = useState<PublicPortfolioShowcaseItem[]>([]);
  const [staticServices, setStaticServices] = useState<{ category: string; items: PortfolioItem[] }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeLightboxItem, setActiveLightboxItem] = useState<PublicPortfolioShowcaseItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const dynamicItems = await getPublicPortfolioShowcase();
        if (isMounted) {
          setPortfolioItems(dynamicItems || []);
        }
      } catch (err) {
        console.warn("Failed loading dynamic portfolio items:", err);
      }

      try {
        const data = await fetchPortfolioPublic();
        if (isMounted && data && data.items) {
          const grouped = FEATURED_CATEGORIES.map(category => ({
            category,
            items: data.items.filter(item => item.category === category),
          })).filter(g => g.items.length > 0);
          setStaticServices(grouped);
        }
      } catch (error) {
        console.error("Failed to load static services:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const availableCategories = useMemo(() => {
    if (!portfolioItems || portfolioItems.length === 0) return [];
    const cats = Array.from(new Set(portfolioItems.map(item => item.category)));
    return ["All", ...cats];
  }, [portfolioItems]);

  const filteredPortfolio = useMemo(() => {
    if (selectedCategory === "All") return portfolioItems;
    return portfolioItems.filter(item => item.category === selectedCategory);
  }, [portfolioItems, selectedCategory]);

  if (loading) {
    return (
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If real dynamic photos published by Admin exist, display "Our Projects / Recent Work" Gallery
  if (portfolioItems && portfolioItems.length > 0) {
    return (
      <section className="py-16 px-6 bg-slate-50/50 relative border-y border-slate-100" id="recent-work-gallery">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <ImageIcon className="w-3.5 h-3.5" /> Recent Work &amp; Project Gallery
              </div>
              <h2
                className="font-bold text-slate-900 tracking-tight mb-2"
                style={{ fontSize: "36px", letterSpacing: "-0.01em" }}
              >
                Our Projects / Real Work
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl">
                Explore real job site documentation and completed projects delivered by H &amp; A Construction LLC.
              </p>
            </div>

            {/* Category Filter Pills */}
            {availableCategories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? "bg-[#0b2a4a] text-white shadow-md"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Portfolio Grid */}
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {filteredPortfolio.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  onClick={() => setActiveLightboxItem(item)}
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-slate-900 flex items-center justify-center">
                    {item.media_type === "video" ? (
                      <div className="w-full h-full relative">
                        <video src={item.signedUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Film className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.signedUrl}
                        alt={item.caption || `${item.category} project`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}

                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#0b2a4a] shadow-xs">
                        {item.category}
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <div className="w-full flex items-center justify-between text-white">
                        <span className="text-xs font-semibold truncate max-w-[80%]">
                          {item.caption || "View Project Detail"}
                        </span>
                        <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-md">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <p className="font-semibold text-slate-800 text-sm line-clamp-2">
                      {item.caption || `${item.category} — Southern Maine Construction`}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <span>Verified H&amp;A Job</span>
                      <span className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Zoom <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Lightbox Modal */}
        {activeLightboxItem && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in"
            onClick={() => setActiveLightboxItem(null)}
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">
                    {activeLightboxItem.category}
                  </span>
                  <span className="text-slate-300 font-medium text-sm">
                    H&amp;A Institutional Portfolio
                  </span>
                </div>
                <button
                  onClick={() => setActiveLightboxItem(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative flex-1 bg-black flex items-center justify-center p-2 min-h-[350px] max-h-[70vh]">
                {activeLightboxItem.media_type === "video" ? (
                  <video
                    src={activeLightboxItem.signedUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={activeLightboxItem.signedUrl}
                    alt={activeLightboxItem.caption || "Enlarged Project Photo"}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                )}
              </div>

              {activeLightboxItem.caption && (
                <div className="p-5 bg-slate-900/90 border-t border-slate-800">
                  <p className="text-white font-medium text-base">
                    {activeLightboxItem.caption}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    H &amp; A Construction LLC — Quality Residential Services
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  // Fallback if no dynamic photos exist yet
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

        {staticServices.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {staticServices.map((service) => (
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
