import { useEffect, useState, useMemo } from "react";
import { Link } from "@/lib/navigation-compat";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Maximize2, X, Image as ImageIcon, Film, Home, ArrowRight } from "lucide-react";
import { getPublicPortfolioShowcase, PublicPortfolioShowcaseItem } from "@/lib/job-media";
import { 
  fetchPublicWebsiteCategories, 
  getHomepageCategories, 
  getProjectsGalleryCategories, 
  WebsiteCategory 
} from "@/lib/website-cms";
import { CardPhotoCarousel } from "@/components/CardPhotoCarousel";

const CategoryCoverPlaceholder = ({ title }: { title: string }) => (
  <div className="w-full h-full bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-md z-10">
      <Home className="w-6 h-6 text-amber-400" />
    </div>
    <h4 className="text-base font-bold text-white z-10 tracking-tight leading-snug">{title}</h4>
    <span className="text-[10px] text-amber-400/90 font-semibold uppercase tracking-wider mt-1 z-10">H &amp; A Construction</span>
  </div>
);

const ServicesShowcase = () => {
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PublicPortfolioShowcaseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeLightboxItem, setActiveLightboxItem] = useState<PublicPortfolioShowcaseItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [cats, dynamicItems] = await Promise.all([
          fetchPublicWebsiteCategories(),
          getPublicPortfolioShowcase()
        ]);
        if (isMounted) {
          setCategories(cats || []);
          setPortfolioItems(dynamicItems || []);
        }
      } catch (err) {
        console.warn("Failed loading ServicesShowcase data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const homepageCategories = useMemo(() => {
    return getHomepageCategories(categories);
  }, [categories]);

  const galleryCategoryNames = useMemo(() => {
    const galleryCats = getProjectsGalleryCategories(categories);
    const names = galleryCats.map(c => c.name);
    
    // Also include any categories present in loaded portfolio items that may not be in list
    portfolioItems.forEach(item => {
      if (item.category && !names.includes(item.category)) {
        names.push(item.category);
      }
      if (Array.isArray(item.categories)) {
        item.categories.forEach(cName => {
          if (cName && !names.includes(cName)) {
            names.push(cName);
          }
        });
      }
    });

    return ["All", ...names];
  }, [categories, portfolioItems]);

  const categoryPhotosMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    portfolioItems.forEach(item => {
      if (item.signedUrl) {
        const catKey = (item.category || "").toLowerCase().trim();
        if (!map[catKey]) map[catKey] = [];
        if (!map[catKey].includes(item.signedUrl)) map[catKey].push(item.signedUrl);

        if (Array.isArray(item.categories)) {
          item.categories.forEach(c => {
            const subKey = (c || "").toLowerCase().trim();
            if (subKey) {
              if (!map[subKey]) map[subKey] = [];
              if (!map[subKey].includes(item.signedUrl)) map[subKey].push(item.signedUrl);
            }
          });
        }
      }
    });
    return map;
  }, [portfolioItems]);

  const filteredPortfolio = useMemo(() => {
    if (selectedCategory === "All") return portfolioItems;
    const cleanSel = selectedCategory.toLowerCase().trim();
    return portfolioItems.filter(item => {
      const mainMatch = (item.category || "").toLowerCase().trim() === cleanSel;
      const subMatch = Array.isArray(item.categories) && item.categories.some(c => (c || "").toLowerCase().trim() === cleanSel);
      return mainMatch || subMatch;
    });
  }, [portfolioItems, selectedCategory]);

  if (loading) {
    return (
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="bg-white">
      {/* 1. Services Cards Section */}
      <section className="py-16 px-6 bg-white relative">
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
                Professional Construction &amp; Remodeling
              </div>
              <h2
                className="font-bold text-slate-900 tracking-tight mb-2"
                style={{ fontSize: "36px", letterSpacing: "-0.01em" }}
              >
                Our Services &amp; Capabilities
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl">
                High-end residential remodeling, custom carpentry, roofing, siding, and full-home renovations across Southern Maine.
              </p>
            </div>

            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline shrink-0"
            >
              View All Services ({categories.length}) <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Dynamic Service Cards Grid with Auto Photo Carousel */}
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {homepageCategories.map((cat, index) => {
              const catPhotos = categoryPhotosMap[cat.name.toLowerCase().trim()] || [];

              return (
                <motion.div
                  key={cat.id || cat.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                >
                  <Link
                    to={`/services/${cat.slug}`}
                    className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                      <CardPhotoCarousel
                        primaryImage={cat.cover_image_url}
                        additionalPhotos={catPhotos}
                        title={cat.name}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/30 text-white">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {cat.description || `Professional ${cat.name.toLowerCase()} services in Southern Maine.`}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-primary font-bold">
                      <span>Explore Service</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          </div>
        </div>
      </section>

      {/* 2. Portfolio Showcase Section */}
      <section className="py-16 px-6 bg-slate-50/70 border-t border-slate-200/80" id="recent-work-gallery">
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
            {galleryCategoryNames.length > 1 && (
              <div className="flex flex-wrap gap-2 max-w-xl">
                {galleryCategoryNames.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
          {filteredPortfolio.length > 0 ? (
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
          ) : (
            <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center">
              <p className="text-slate-600 font-medium">
                No published photographs for "{selectedCategory}" in gallery yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select another category or view all verified projects above.
              </p>
            </div>
          )}
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
    </div>
  );
};

export default ServicesShowcase;
