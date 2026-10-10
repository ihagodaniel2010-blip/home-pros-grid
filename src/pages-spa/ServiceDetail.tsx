import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowRight, Image as ImageIcon, Maximize2, X, Film, CheckCircle2, ShieldCheck, Home } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { fetchPublicWebsiteCategories, 
  getCategoryBySlug, 
  WebsiteCategory 
} from "@/lib/website-cms";
import { getPublicPortfolioShowcase, PublicPortfolioShowcaseItem, isCategoryMatch } from "@/lib/job-media";
import { CardPhotoCarousel } from "@/components/CardPhotoCarousel";

const CategoryPlaceholderImage = ({ name }: { name: string }) => (
  <div className="w-full h-full bg-gradient-to-br from-[#0b2a4a] via-[#103b66] to-slate-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-lg z-10">
      <Home className="w-8 h-8 text-amber-400" />
    </div>
    <h3 className="text-xl font-bold text-white z-10 tracking-tight">{name}</h3>
    <span className="text-xs text-amber-400/90 font-semibold uppercase tracking-wider mt-1 z-10">H &amp; A Construction LLC</span>
  </div>
);

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [category, setCategory] = useState<WebsiteCategory | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PublicPortfolioShowcaseItem[]>([]);
  const [activeLightboxItem, setActiveLightboxItem] = useState<PublicPortfolioShowcaseItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [cats, media] = await Promise.all([
          fetchPublicWebsiteCategories(),
          getPublicPortfolioShowcase()
        ]);
        
        if (isMounted) {
          setCategories(cats);
          setPortfolioItems(media || []);
          if (slug) {
            const matched = getCategoryBySlug(cats, slug);
            setCategory(matched || null);
          }
        }
      } catch (err) {
        console.warn("Failed loading service detail data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [slug]);

  const categoryPhotos = useMemo(() => {
    if (!category || !portfolioItems || portfolioItems.length === 0) return [];
    return portfolioItems.filter(item => {
      const text = `${item.caption || ''} ${item.file_name || ''}`;
      return (
        isCategoryMatch(category.name, item.category, item.categories, text) ||
        isCategoryMatch(category.slug, item.category, item.categories, text)
      );
    });
  }, [category, portfolioItems]);

  const otherCategories = useMemo(() => {
    if (!category) return categories.slice(0, 4);
    return categories.filter(c => c.slug !== category.slug).slice(0, 4);
  }, [categories, category]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#0b2a4a] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Service Category Not Found</h1>
          <p className="text-slate-600 mb-8">
            The requested construction service category could not be located or may no longer be active.
          </p>
          <Button onClick={() => navigate("/services")} className="bg-[#0b2a4a] hover:bg-[#103b66] text-white">
            Explore All Services
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Banner Header */}
      <section className="relative bg-[#0b2a4a] text-white py-16 md:py-24 px-6 border-b border-slate-800 overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-6">
            <Link to="/" className="hover:underline">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/services" className="hover:underline">Services</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200">{category.name}</span>
          </nav>

          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7">
              <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-400/30">
                Southern Maine Construction
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white leading-tight">
                {category.name}
              </h1>
              <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
                {category.description || `Professional ${category.name.toLowerCase()} services provided by licensed and insured experts at H & A Construction LLC.`}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate(`/quote/${category.slug}`)}
                  className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm px-6 h-12 rounded-xl shadow-lg flex items-center gap-2"
                >
                  Request Free Estimate <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => navigate("/contact")}
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800 font-bold text-sm px-6 h-12 rounded-xl"
                >
                  Contact Contractor
                </Button>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900">
                <CardPhotoCarousel
                  primaryImage={category.cover_image_url}
                  additionalPhotos={
                    categoryPhotos.length > 0
                      ? (categoryPhotos.map(p => p.signedUrl).filter(Boolean) as string[])
                      : (portfolioItems.map(p => p.signedUrl).filter(Boolean) as string[])
                  }
                  title={category.name}
                  intervalMs={3000}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Guarantees Bar */}
      <section className="bg-slate-100/80 border-b border-slate-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dedicated Contractor Communication
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Fully Licensed &amp; Insured LLC
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free On-Site Consultation &amp; Estimate
          </div>
        </div>
      </section>

      {/* Real Project Photo Gallery for this Category */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
              <ImageIcon className="w-3.5 h-3.5" /> Project Portfolio
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {category.name} Projects &amp; Work Documentation
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Explore real job site documentation and completed projects for {category.name.toLowerCase()} in Southern Maine.
            </p>
          </div>

          {categoryPhotos.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categoryPhotos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveLightboxItem(item)}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-4/3 bg-slate-900 flex items-center justify-center overflow-hidden">
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
                        alt={item.caption || `${category.name} photo`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}

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
                      {item.caption || `${category.name} — Verified H&A Project`}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <span>Verified H&amp;A Job</span>
                      <span className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Zoom <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-slate-600 font-medium">
                No specific photos have been tagged for {category.name} yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Photos published in the Admin CMS will automatically appear in this gallery.
              </p>
            </div>
          )}
        </div>
      </section>

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
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ea580c] text-white">
                  {category.name}
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

      {/* Explore Other Services */}
      {otherCategories.length > 0 && (
        <section className="py-16 px-6 bg-slate-50 border-t border-slate-200">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Explore Other Construction Services</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {otherCategories.map(cat => (
                <Link
                  key={cat.id}
                  to={`/services/${cat.slug}`}
                  className="p-4 bg-white rounded-xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-base mb-1">{cat.name}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{cat.description}</p>
                  </div>
                  <span className="text-xs font-bold text-primary mt-4 flex items-center gap-1">
                    Learn More <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default ServiceDetail;
