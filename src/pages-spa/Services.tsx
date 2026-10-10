import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ChevronRight, Home, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { fetchPublicWebsiteCategories, WebsiteCategory } from "@/lib/website-cms";
import { getPublicPortfolioShowcase, PublicPortfolioShowcaseItem, isCategoryMatch } from "@/lib/job-media";
import { CardPhotoCarousel } from "@/components/CardPhotoCarousel";

const CategoryCoverPlaceholder = ({ name }: { name: string }) => (
  <div className="w-full h-full bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-md">
      <Home className="w-5 h-5 text-amber-400" />
    </div>
    <h4 className="text-sm font-bold text-white tracking-tight leading-snug">{name}</h4>
  </div>
);

const Services = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PublicPortfolioShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchPublicWebsiteCategories(),
      getPublicPortfolioShowcase()
    ]).then(([cats, items]) => {
      if (isMounted) {
        setCategories(cats || []);
        setPortfolioItems(items || []);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const categoryPhotosMap = useMemo(() => {
    const map: Record<string, string[]> = {};

    categories.forEach(cat => {
      const catName = cat.name;
      const catSlug = cat.slug;
      const matchedPhotos: string[] = [];

      portfolioItems.forEach(item => {
        if (item.signedUrl) {
          const itemCat = item.category || "";
          const subCats = Array.isArray(item.categories) ? item.categories.join(" ") : "";
          const fullText = `${itemCat} ${subCats} ${item.caption || ""} ${item.file_name || ""}`;

          if (isCategoryMatch(fullText, catName) || isCategoryMatch(fullText, catSlug)) {
            if (!matchedPhotos.includes(item.signedUrl)) {
              matchedPhotos.push(item.signedUrl);
            }
          }
        }
      });

      map[catName.toLowerCase().trim()] = matchedPhotos;
      map[catSlug.toLowerCase().trim()] = matchedPhotos;
    });

    return map;
  }, [categories, portfolioItems]);

  const filtered = categories.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            H &amp; A Construction Services
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Residential Construction &amp; Remodeling Services
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl">
            Browse all service categories managed directly through our CMS portal. Serving Southern Maine with quality craftsmanship.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative mb-10 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="Search construction services (e.g. Drywall, Roofing, Framing)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 py-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((s, i) => {
                const catPhotos = categoryPhotosMap[s.name.toLowerCase().trim()] || categoryPhotosMap[s.slug.toLowerCase().trim()] || [];

                return (
                  <motion.div
                    key={s.id || s.slug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                  >
                    <Link
                      to={`/services/${s.slug}`}
                      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                    >
                      <div className="relative aspect-4/3 overflow-hidden bg-slate-900">
                        <CardPhotoCarousel
                          primaryImage={s.cover_image_url}
                          additionalPhotos={catPhotos}
                          title={s.name}
                        />

                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                          <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full text-white">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1.5 group-hover:text-primary transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {s.description || `Quality ${s.name.toLowerCase()} services in Southern Maine.`}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-primary">
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-600 font-medium">No service categories found matching "{query}"</p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-3 text-xs font-bold text-primary hover:underline"
                >
                  Clear search filter
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Services;
