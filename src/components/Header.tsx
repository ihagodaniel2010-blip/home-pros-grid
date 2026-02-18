import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { topServices } from "@/data/services";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-background/80 backdrop-blur-xl transition-all duration-300 ${scrolled ? "shadow-sm border-b border-border/50" : "border-b border-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary tracking-tight">
          Networx
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200"
            >
              Find a Pro <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-0 mt-3 w-60 glass-card-strong py-2 z-50"
                >
                  {topServices.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/quote/${s.slug}`}
                      className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {s.name}
                    </Link>
                  ))}
                  <div className="border-t border-border/50 mt-1 pt-1">
                    <Link
                      to="/services"
                      className="block px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      View All Services →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {[
            { to: "/blog", label: "Blog" },
            { to: "/cost-guide", label: "Cost Guide" },
            { to: "/experiences", label: "Experiences" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/login")}
            className="rounded-full px-5 border-border/60 hover:border-primary/40 transition-all duration-200"
          >
            Login
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/join")}
            className="rounded-full px-5 shadow-md hover:shadow-lg transition-all duration-200"
          >
            Join As a Pro
          </Button>
        </div>

        <button className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 py-5 space-y-1 overflow-hidden"
          >
            <Link to="/services" className="block py-3 text-sm font-medium hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>Find a Pro</Link>
            <Link to="/blog" className="block py-3 text-sm font-medium hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>Blog</Link>
            <Link to="/cost-guide" className="block py-3 text-sm font-medium hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>Cost Guide</Link>
            <Link to="/experiences" className="block py-3 text-sm font-medium hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>Experiences</Link>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => { navigate("/login"); setMobileOpen(false); }}>Login</Button>
              <Button size="sm" className="flex-1 rounded-full" onClick={() => { navigate("/join"); setMobileOpen(false); }}>Join As a Pro</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
