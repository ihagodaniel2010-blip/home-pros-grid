import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { allServices } from "@/data/services";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [zip, setZip] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? allServices.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStart = () => {
    if (filtered.length > 0) {
      navigate(`/quote/${filtered[0].slug}${zip ? `?zip=${zip}` : ""}`);
    } else if (query) {
      navigate(`/services?q=${encodeURIComponent(query)}`);
    }
  };

  const selectService = (slug: string) => {
    setShowSuggestions(false);
    navigate(`/quote/${slug}${zip ? `?zip=${zip}` : ""}`);
  };

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 navy-gradient-hero opacity-85" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      <div className="relative z-10 text-center px-6 py-24 max-w-3xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-5 tracking-tight"
        >
          Your Home. Happier.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="text-lg md:text-xl text-white/75 mb-10 font-light"
        >
          Finding the right contractor is fast, easy and free.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          ref={wrapperRef}
          className="relative"
        >
          <div className="glass-card-strong flex flex-col sm:flex-row items-stretch gap-0 p-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                className="w-full h-12 pl-11 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none rounded-lg"
                placeholder="What type of pro are you looking for?"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
              {showSuggestions && filtered.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 glass-card-strong z-50 py-1 max-h-64 overflow-y-auto"
                >
                  {filtered.map((s) => (
                    <button
                      key={s.slug}
                      className="w-full text-left px-4 py-3 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                      onClick={() => selectService(s.slug)}
                    >
                      {s.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <div className="hidden sm:block w-px bg-border/40 my-2" />
            <div className="relative sm:w-36">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                className="w-full h-12 pl-11 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none rounded-lg"
                placeholder="Zip Code"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
            </div>
            <button
              onClick={handleStart}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98] whitespace-nowrap"
            >
              Start
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
