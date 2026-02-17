import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allServices } from "@/data/services";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [zip, setZip] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? allServices.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
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
    <section className="relative min-h-[520px] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-primary/70" />
      <div className="relative z-10 text-center px-4 py-20 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
          Your Home. Happier.
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/90 mb-8">
          Finding the right contractor is fast, easy and free!
        </p>
        <div className="bg-background rounded-lg p-2 flex flex-col sm:flex-row gap-2 shadow-xl" ref={wrapperRef}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 border-0 bg-transparent focus-visible:ring-0 text-sm"
              placeholder="What type of pro are you looking for?"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                {filtered.map((s) => (
                  <button
                    key={s.slug}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    onClick={() => selectService(s.slug)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            className="sm:w-32 border-0 bg-secondary text-sm rounded-md"
            placeholder="Zip Code"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          />
          <Button className="px-8" onClick={handleStart}>Start</Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
