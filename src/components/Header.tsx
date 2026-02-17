import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { topServices } from "@/data/services";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-primary tracking-tight">
          Networx
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Find a Pro <ChevronDown className="h-4 w-4" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-2 z-50">
                {topServices.map((s) => (
                  <Link
                    key={s.slug}
                    to={`/quote/${s.slug}`}
                    className="block px-4 py-2 text-sm text-card-foreground hover:bg-accent transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {s.name}
                  </Link>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <Link
                    to="/services"
                    className="block px-4 py-2 text-sm font-medium text-primary hover:bg-accent transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    View All Services →
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link to="/blog" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Blog</Link>
          <Link to="/cost-guide" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Cost Guide</Link>
          <Link to="/experiences" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Experiences</Link>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> 855-617-8390
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate("/login")}>Login</Button>
          <Button size="sm" onClick={() => navigate("/join")}>Join As a Pro</Button>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          <Link to="/services" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Find a Pro</Link>
          <Link to="/blog" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Blog</Link>
          <Link to="/cost-guide" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Cost Guide</Link>
          <Link to="/experiences" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Experiences</Link>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => { navigate("/login"); setMobileOpen(false); }}>Login</Button>
            <Button size="sm" className="flex-1" onClick={() => { navigate("/join"); setMobileOpen(false); }}>Join As a Pro</Button>
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground pt-1"><Phone className="h-3.5 w-3.5" /> 855-617-8390</p>
        </div>
      )}
    </header>
  );
};

export default Header;
