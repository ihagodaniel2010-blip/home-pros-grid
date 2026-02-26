import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchPortfolioPublic } from "@/lib/portfolio-api";
import type { PortfolioItem } from "@/lib/portfolio-types";

const sortOptions = ["Featured", "Newest", "Most Popular"];

const fallbackItems: PortfolioItem[] = [
  {
    id: "modern-kitchen-upgrade",
    title: "Modern Kitchen Upgrade",
    category: "Kitchens",
    coverImage: "/aEomQEx4Q2sZ.com/media/250x165/L4iJEJBgnVg6.jpeg",
    images: [
      "/aEomQEx4Q2sZ.com/media/250x165/L4iJEJBgnVg6.jpeg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
    ],
    tags: ["Kitchen", "Remodeling"],
    scope: "Layout refresh • Custom cabinetry",
    description: "A bright, open kitchen transformation with refined cabinetry and upgraded finishes.",
    highlights: ["Custom cabinetry", "Quartz counters", "Lighting redesign"],
    materials: ["Quartz", "Matte brass fixtures", "Solid oak"],
    timeline: ["Demo", "Prep", "Install", "Finish"],
    featured: true,
    beforeAfter: {
      before: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
      after: "/aEomQEx4Q2sZ.com/media/250x165/L4iJEJBgnVg6.jpeg",
    },
  },
  {
    id: "spa-bathroom-renewal",
    title: "Spa Bathroom Renewal",
    category: "Bathrooms",
    coverImage: "/aEomQEx4Q2sZ.com/media/250x165/AW6h4tL4mBvH.jpeg",
    images: [
      "/aEomQEx4Q2sZ.com/media/250x165/AW6h4tL4mBvH.jpeg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/fSS86TPTtzR5.png",
    ],
    tags: ["Bathroom", "Remodeling"],
    scope: "Tile refresh • Fixture upgrade",
    description: "A calming, spa-inspired bathroom refresh with clean lines and premium materials.",
    highlights: ["New tile", "Glass shower", "Brushed fixtures"],
    materials: ["Porcelain", "Glass", "Brushed nickel"],
    timeline: ["Demo", "Prep", "Install", "Finish"],
    featured: true,
  },
  {
    id: "flooring-transformation",
    title: "Flooring Transformation",
    category: "Flooring",
    coverImage: "/aEomQEx4Q2sZ.com/media/250x165/AOX0l9K8erbq.png",
    images: [
      "/aEomQEx4Q2sZ.com/media/250x165/AOX0l9K8erbq.png",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
    ],
    tags: ["Flooring", "Renovation"],
    scope: "Luxury vinyl • Acoustic underlay",
    description: "Durable flooring layers paired with a polished finish for an elegant upgrade.",
    highlights: ["Luxury vinyl", "Acoustic padding", "Seamless transitions"],
    materials: ["LVP", "Acoustic foam", "Oak trim"],
    timeline: ["Demo", "Prep", "Install", "Finish"],
    featured: true,
  },
  {
    id: "exterior-paint-reveal",
    title: "Exterior Paint Reveal",
    category: "Painting",
    coverImage: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/fSS86TPTtzR5.png",
    images: [
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/fSS86TPTtzR5.png",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
    ],
    tags: ["Painting", "Exterior"],
    scope: "Prep • Prime • Finish",
    description: "A crisp exterior repaint with premium coatings and trim detailing.",
    highlights: ["Surface prep", "Trim refresh", "Weatherproof seal"],
    materials: ["Premium primer", "Exterior enamel", "Sealants"],
    timeline: ["Prep", "Paint", "Finish"],
  },
  {
    id: "roofing-refresh",
    title: "Roofing Refresh",
    category: "Roofing",
    coverImage: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UZP1Emv43ZoL.png",
    images: [
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UZP1Emv43ZoL.png",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
    ],
    tags: ["Roofing", "Exterior"],
    scope: "Shingles • Ventilation",
    description: "Precision roofing update with upgraded shingles and ventilation improvements.",
    highlights: ["New shingles", "Ridge vent", "Underlayment"],
    materials: ["Architectural shingles", "Ventilation kit", "Flashing"],
    timeline: ["Demo", "Install", "Finish"],
  },
  {
    id: "remodel-living",
    title: "Living Room Remodel",
    category: "Remodeling",
    coverImage: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
    images: [
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
      "/aEomQEx4Q2sZ.com/media/250x165/AW6h4tL4mBvH.jpeg",
    ],
    tags: ["Remodeling", "Interiors"],
    scope: "Open-plan refresh",
    description: "An open, airy living space upgraded with tailored finishes and lighting.",
    highlights: ["Built-ins", "Lighting plan", "Premium trim"],
    materials: ["Custom millwork", "LED lighting", "Paint finish"],
    timeline: ["Demo", "Prep", "Install", "Finish"],
    beforeAfter: {
      before: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
      after: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
    },
  },
  {
    id: "deck-outdoor-upgrade",
    title: "Deck & Outdoor Upgrade",
    category: "Decks",
    coverImage: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
    images: [
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/media/250x165/L4iJEJBgnVg6.jpeg",
    ],
    tags: ["Decks", "Outdoor"],
    scope: "Composite deck refresh",
    description: "Outdoor entertaining space refreshed with resilient materials and clean lines.",
    highlights: ["Composite deck", "Railing update", "Outdoor lighting"],
    materials: ["Composite boards", "Stainless fixtures", "Outdoor lights"],
    timeline: ["Demo", "Install", "Finish"],
  },
  {
    id: "outdoor-living",
    title: "Outdoor Living Retreat",
    category: "Outdoor",
    coverImage: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
    images: [
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
      "/aEomQEx4Q2sZ.com/resources/images/networx/v2/ay0Wmaq4Mak8.jpg",
      "/aEomQEx4Q2sZ.com/media/250x165/k0jKHZgh5ySn.png",
    ],
    tags: ["Outdoor", "Lifestyle"],
    scope: "Lounge design",
    description: "A serene outdoor lounge with warm textures and functional amenities.",
    highlights: ["Pergola", "Lounge seating", "Ambient lighting"],
    materials: ["Treated wood", "Outdoor fabrics", "Lighting"],
    timeline: ["Plan", "Install", "Finish"],
  },
  {
    id: "before-after-signature",
    title: "Signature Before & After",
    category: "Before & After",
    coverImage: "/aEomQEx4Q2sZ.com/media/250x165/AW6h4tL4mBvH.jpeg",
    images: [
      "/aEomQEx4Q2sZ.com/media/250x165/AW6h4tL4mBvH.jpeg",
      "/aEomQEx4Q2sZ.com/media/250x165/AOX0l9K8erbq.png",
      "/aEomQEx4Q2sZ.com/media/250x165/L4iJEJBgnVg6.jpeg",
    ],
    tags: ["Before & After", "Remodeling"],
    scope: "Full transformation",
    description: "See the transformation side-by-side with a refined before & after comparison.",
    highlights: ["Full repaint", "New flooring", "Lighting refresh"],
    materials: ["Premium paint", "Flooring", "Lighting"],
    timeline: ["Demo", "Prep", "Install", "Finish"],
    beforeAfter: {
      before: "/aEomQEx4Q2sZ.com/media/250x165/AW6h4tL4mBvH.jpeg",
      after: "/aEomQEx4Q2sZ.com/media/250x165/AOX0l9K8erbq.png",
    },
  },
];

const fallbackCategories = [
  "Kitchens",
  "Bathrooms",
  "Bedrooms",
  "Flooring",
  "Painting",
  "Roofing",
  "Remodeling",
  "Decks",
  "Outdoor",
];

const metrics = [
  { label: "Projects delivered", value: "420+" },
  { label: "Avg. turnaround", value: "6 days" },
  { label: "Client satisfaction", value: "4.9/5" },
];

const steps = [
  { title: "Consultation", text: "We define goals, budgets, and vision." },
  { title: "Planning", text: "Materials, timelines, and scope aligned." },
  { title: "Execution", text: "Craftsmanship delivered with precision." },
  { title: "Final walkthrough", text: "We polish every detail together." },
];

const BeforeAfter = ({ before, after }: { before: string; after: string }) => {
  const [value, setValue] = useState(55);

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-slate-100">
      <img src={after} alt="After" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0" style={{ width: `${value}%`, overflow: "hidden" }}>
        <img src={before} alt="Before" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <span className="absolute left-4 top-4 text-xs font-semibold uppercase tracking-widest text-white/90">Before</span>
      <span className="absolute right-4 top-4 text-xs font-semibold uppercase tracking-widest text-white/90">After</span>
      <div className="absolute inset-y-0" style={{ left: `${value}%` }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow" />
      </div>
      <input
        aria-label="Before and after slider"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  );
};

const CostGuide = () => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(fallbackItems);
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [active, setActive] = useState("All");
  const [sortBy, setSortBy] = useState("Featured");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let activeRequest = true;
    fetchPortfolioPublic()
      .then((payload) => {
        if (!activeRequest || !payload) return;
        if (payload.items?.length) setPortfolioItems(payload.items);
        if (payload.categories?.length) setCategories(payload.categories);
      })
      .finally(() => {
        if (activeRequest) setIsLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, []);

  const filters = useMemo(() => {
    const base = categories.length
      ? categories
      : Array.from(new Set(portfolioItems.map((item) => item.category).filter(Boolean)));
    return ["All", ...base, "Before & After"];
  }, [categories, portfolioItems]);

  const filtered = useMemo(() => {
    const base = portfolioItems.filter((item) => {
      const matchesCategory =
        active === "All" ||
        (active === "Before & After" ? item.beforeAfter : item.category === active);
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.join(" ").toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });

    if (sortBy === "Newest") return [...base].reverse();
    if (sortBy === "Most Popular") return [...base].sort((a, b) => b.tags.length - a.tags.length);
    return [...base].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [active, query, sortBy, portfolioItems]);

  const featured = useMemo(
    () => portfolioItems.filter((item) => item.featured).slice(0, 3),
    [portfolioItems]
  );

  useEffect(() => {
    if (!selected) return;
    setActiveImage(0);
  }, [selected]);

  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [selected]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (selected && modalRef.current) {
      modalRef.current.focus();
    }
  }, [selected]);

  const openItem = (item: PortfolioItem) => setSelected(item);

  const goPrev = () => {
    if (!selected) return;
    setActiveImage((prev) => (prev - 1 + selected.images.length) % selected.images.length);
  };

  const goNext = () => {
    if (!selected) return;
    setActiveImage((prev) => (prev + 1) % selected.images.length);
  };

  return (
    <Layout>
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/media/250x165/portifolio.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-slate-900/20" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl font-semibold tracking-tight">Portfolio</h1>
            <p className="mt-4 text-lg text-white/80">A curated selection of high-finish transformations.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/quote/carpentry"
                className="rounded-full bg-white text-slate-900 px-6 py-3 text-sm font-semibold hover:bg-white/90 transition"
              >
                Request a Quote
              </Link>
              <a
                href="#portfolio-grid"
                className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                View Work
              </a>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="border border-white/20 rounded-2xl px-4 py-3">
                  <div className="text-xl font-semibold">{metric.value}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/60 mt-1">{metric.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-white/50">
            Scroll
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-slate-900">Featured Projects</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {featured.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -4 }}
                className="rounded-3xl overflow-hidden bg-white shadow-lg"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="h-72 w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.description}</p>
                  <div className="mt-3 text-xs text-slate-500">{item.tags.join(" • ")}</div>
                  <button
                    onClick={() => openItem(item)}
                    className="mt-4 inline-flex items-center text-sm font-semibold text-primary"
                  >
                    View Case →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio-grid" className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              {filters.map((label) => (
                <button
                  key={label}
                  onClick={() => setActive(label)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    active === label
                      ? "bg-primary text-white shadow"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isLoading && (
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Syncing portfolio</span>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-9 pr-4 py-2 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-full border border-slate-200 py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option}>
                    Sort by: {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <motion.div
            layout
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => (
                <motion.button
                  layout
                  key={item.id}
                  onClick={() => openItem(item)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="group text-left"
                >
                  <div
                    className={`overflow-hidden rounded-2xl bg-slate-100 relative ${idx % 3 === 0 ? "lg:h-72" : "lg:h-60"}`}
                    style={{ boxShadow: "0 12px 26px rgba(11,42,74,0.12)" }}
                  >
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      loading="lazy"
                      className="h-60 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-tr from-white/0 via-white/0 to-white/30" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.tags.join(" • ")}</p>
                    <p className="text-xs text-slate-500 mt-1">Scope: {item.scope}</p>
                    <span className="text-sm font-semibold text-primary mt-2 inline-flex">View details →</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <section className="py-14 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-slate-900">How we work</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.title} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500 mt-2">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-slate-900">Trusted by</h3>
              <p className="text-sm text-slate-500 mt-2">Licensed • Insured • Verified</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Licensed</span>
              <span>Insured</span>
              <span>Verified</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl bg-slate-900 text-white px-8 py-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-3xl font-semibold">Ready to upgrade your home?</h3>
              <p className="text-sm text-white/70 mt-2">Fast response • High-finish results</p>
            </div>
            <Link
              to="/quote/carpentry"
              className="rounded-full bg-white text-slate-900 px-6 py-3 text-sm font-semibold hover:bg-white/90 transition"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="absolute inset-0 bg-black/50"
              aria-label="Close portfolio modal"
              onClick={() => setSelected(null)}
            />
            <motion.div
              ref={modalRef}
              tabIndex={-1}
              className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <button
                className="absolute top-4 right-4 p-2 rounded-full bg-white shadow"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                <div className="p-6 space-y-6">
                  {selected.beforeAfter ? (
                    <BeforeAfter before={selected.beforeAfter.before} after={selected.beforeAfter.after} />
                  ) : (
                    <div className="relative">
                      <img
                        src={selected.images[activeImage]}
                        alt={selected.title}
                        className="w-full h-72 object-cover rounded-2xl"
                        loading="lazy"
                      />
                      <button
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow"
                        onClick={goPrev}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow"
                        onClick={goNext}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-3">
                    {selected.images.slice(0, 4).map((img, idx) => (
                      <button
                        key={img}
                        className={`rounded-xl overflow-hidden border ${idx === activeImage ? "border-primary" : "border-transparent"}`}
                        onClick={() => setActiveImage(idx)}
                        aria-label={`Select image ${idx + 1}`}
                      >
                        <img src={img} alt="Gallery thumbnail" className="h-16 w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-6 border-l border-slate-100">
                  <h2 className="text-2xl font-semibold text-slate-900">{selected.title}</h2>
                  <p className="mt-3 text-slate-600 text-sm leading-6">{selected.description}</p>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">What we delivered</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {selected.highlights.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">Materials & finishes</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {selected.materials.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
                    <div className="mt-3 space-y-2">
                      {selected.timeline.map((step) => (
                        <div key={step} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">Testimonial</h3>
                    <p className="text-sm text-slate-600 mt-2">
                      “The team delivered beyond expectations. Quality craftsmanship and a flawless finish.”
                    </p>
                  </div>

                  <div className="sticky bottom-0 bg-white pt-6">
                    <Link
                      to="/quote/carpentry"
                      className="inline-flex items-center justify-center w-full rounded-full bg-primary text-white py-3 text-sm font-semibold hover:bg-primary/90 transition"
                    >
                      Request a Quote
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default CostGuide;
