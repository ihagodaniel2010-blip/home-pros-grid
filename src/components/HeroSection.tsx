import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@/lib/navigation-compat";
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
    <section
      className="relative flex items-center justify-center overflow-hidden -mt-[72px] pt-[72px]"
      style={{
        height: '500px',
        minHeight: '500px'
      }}
    >
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: `url(${heroBg})`, backgroundPosition: 'center 26%', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}
      />
      <div className="absolute inset-0" style={{
        background: 'rgba(0,0,0,0.35)'
      }} />

      <div className="relative z-10 text-center px-6 mx-auto w-full max-w-4xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-white font-bold"
          style={{
            fontSize: '48px',
            fontWeight: 800,
            letterSpacing: '-1px',
            textAlign: 'center',
            textShadow: '0 10px 30px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.2,
            marginBottom: '14px'
          }}
        >
          Your Home. Happier.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="text-white text-center"
          style={{
            fontSize: '18px',
            fontWeight: 400,
            opacity: 0.95,
            textShadow: '0 4px 12px rgba(0,0,0,0.2)',
            marginBottom: '28px',
            lineHeight: 1.6,
            maxWidth: '600px'
          }}
        >
          Finding the right contractor is fast, easy and free!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          ref={wrapperRef}
          className="relative w-full"
          style={{ marginTop: '12px', maxWidth: '700px' }}
        >
          <div className="flex flex-col sm:flex-row items-stretch gap-0 transition-all duration-300" style={{
            boxShadow: '0 0 0px 9px rgba(0,0,0,0.28)',
            borderRadius: '28px',
            height: '58px',
            overflow: 'visible'
          }}>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                className="w-full h-full pl-12 pr-4 bg-white text-base text-slate-800 placeholder:text-slate-500 focus:outline-none transition-all duration-300"
                style={{
                  borderRadius: '28px 0 0 28px'
                }}
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
                  className="absolute top-full left-0 right-0 mt-2 bg-white z-50 py-1 max-h-64 overflow-y-auto"
                  style={{ borderRadius: '12px', boxShadow: '0 12px 30px rgba(11,42,74,0.14)' }}
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
            <div className="hidden sm:block w-px bg-slate-200" />
            <div className="relative" style={{ width: '120px', flex: '0 0 120px' }}>
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                className="w-full h-full pl-11 pr-4 bg-white text-base text-slate-800 placeholder:text-slate-500 focus:outline-none transition-all duration-300"
                style={{
                  borderRadius: '0'
                }}
                placeholder="Zip Code"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
            </div>
            <button
              onClick={handleStart}
              className="h-full bg-primary hover:bg-primary/90 text-white text-base font-semibold transition-all duration-250 active:scale-[0.98] whitespace-nowrap"
              style={{ borderRadius: '0 28px 28px 0', width: '170px', flex: '0 0 170px' }}
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
