import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, LogIn, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { topServices } from "@/data/services";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [findProOpen, setFindProOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  
  const findProRef = useRef<HTMLDivElement>(null);
  const findProTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const loginRef = useRef<HTMLDivElement>(null);
  const loginTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detect if on hero page (homepage)
  const isHeroPage = location.pathname === "/";
  const isNavLinkActive = (path: string) => location.pathname === path || (path === "/" && location.pathname === "/");

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (findProRef.current && !findProRef.current.contains(e.target as Node)) {
        setFindProOpen(false);
      }
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFindProOpen(false);
        setLoginOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Find Pro dropdown handlers with robust hover
  const handleFindProEnter = () => {
    if (findProTimerRef.current) clearTimeout(findProTimerRef.current);
    setFindProOpen(true);
  };

  const handleFindProLeave = () => {
    findProTimerRef.current = setTimeout(() => {
      setFindProOpen(false);
    }, 320);
  };

  // Login dropdown handlers with robust hover
  const handleLoginEnter = () => {
    if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    setLoginOpen(true);
  };

  const handleLoginLeave = () => {
    loginTimerRef.current = setTimeout(() => {
      setLoginOpen(false);
    }, 320);
  };

  // Navigate and close dropdown
  const handleFindProClick = (slug: string) => {
    navigate(`/quote/${slug}`);
    setTimeout(() => setFindProOpen(false), 80);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setTimeout(() => setLoginOpen(false), 80);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (findProTimerRef.current) clearTimeout(findProTimerRef.current);
      if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    };
  }, []);

  return (
    <header className={`relative z-50 transition-all duration-300 ${
      isHeroPage 
        ? "bg-transparent" 
        : "bg-white shadow-sm border-b border-slate-100/30"
    }`} style={
      isHeroPage ? {} : {
        boxShadow: '0 2px 8px rgba(11,42,74,0.04)'
      }
    }>
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link to="/" className={`text-xl font-bold tracking-tight ${
          isHeroPage ? "text-white" : "text-primary"
        }`}>
          Barrigudo
        </Link>

        <nav className={`hidden lg:flex items-center gap-8 ml-auto mr-8 ${isHeroPage ? "text-white" : ""}`}>
          {/* Find a Pro Dropdown */}
          <div 
            ref={findProRef}
            className="relative"
            onPointerEnter={handleFindProEnter}
            onPointerLeave={handleFindProLeave}
          >
            <button
              className={`flex items-center gap-1.5 text-base font-semibold transition-all duration-200 ${
                findProOpen 
                  ? isHeroPage 
                    ? "text-white/90" 
                    : "text-primary bg-primary/5 px-3 py-1.5 rounded-lg"
                  : isHeroPage
                    ? "text-white/80 hover:text-white"
                    : "text-foreground/80 hover:text-primary"
              }`}
            >
              Find a Pro <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${findProOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Invisible bridge to prevent hover gap */}
            {findProOpen && (
              <div className="absolute top-full left-0 right-0 h-3 pointer-events-auto" style={{
                background: 'transparent'
              }} />
            )}

            <AnimatePresence>
              {findProOpen && (
                <>
                  {/* Pointer Arrow */}
                  <motion.div
                    initial={{ opacity: 0, translateY: -10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    style={{ top: '48px' }}
                  >
                    <div 
                      className="w-0 h-0"
                      style={{
                        borderLeft: '7px solid transparent',
                        borderRight: '7px solid transparent',
                        borderBottom: '8px solid rgb(255, 255, 255)',
                        filter: '0 4px 12px rgba(11,42,74,0.08)'
                      }}
                    />
                  </motion.div>

                  {/* Dropdown Panel */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl z-50 py-2 border border-slate-200/50"
                    style={{
                      boxShadow: '0 12px 40px rgba(11,42,74,0.12), 0 4px 12px rgba(11,42,74,0.08)'
                    }}
                    onPointerEnter={handleFindProEnter}
                    onPointerLeave={handleFindProLeave}
                  >
                    <div className="max-h-96 overflow-y-auto">
                      {topServices.map((s) => (
                        <button
                          key={s.slug}
                          onClick={() => handleFindProClick(s.slug)}
                          className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-200/50 mt-2 pt-2">
                      <Link
                        to="/services"
                        className="block px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => setTimeout(() => setFindProOpen(false), 50)}
                      >
                        View All Services →
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {[
            { to: "/about", label: "About" },
            { to: "/cost-guide", label: "Portfolio" },
            { to: "/experiences", label: "Experiences" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-base font-semibold transition-colors duration-200 relative ${
                isNavLinkActive(link.to)
                  ? isHeroPage
                    ? "text-white"
                    : "text-primary"
                  : isHeroPage
                    ? "text-white/80 hover:text-white"
                    : "text-foreground/80 hover:text-primary"
              }`}
            >
              {link.label}
              {isNavLinkActive(link.to) && (
                <motion.div
                  layoutId="activeIndicator"
                  className={`absolute -bottom-1 left-0 right-0 h-1 rounded-full ${
                    isHeroPage ? "bg-white" : "bg-primary"
                  }`}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className={`hidden lg:flex items-center gap-3 ${isHeroPage ? "text-white" : ""}`}>
          {/* Login Dropdown */}
          <div
            ref={loginRef}
            className="relative"
            onPointerEnter={handleLoginEnter}
            onPointerLeave={handleLoginLeave}
          >
            <Button
              size="sm"
              className={`rounded-full px-5 transition-all duration-200 cursor-pointer ${
                isHeroPage
                  ? "bg-white text-[#0b2a4a] border border-white hover:bg-slate-100"
                  : `border border-border/60 text-foreground ${loginOpen ? "bg-primary/5 border-primary/40 text-primary" : "hover:border-primary/40"}`
              }`}
              onClick={() => setLoginOpen(!loginOpen)}
              variant={isHeroPage ? undefined : "outline"}
            >
              Login <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform duration-200 ${loginOpen ? "rotate-180" : ""}`} />
            </Button>

            {/* Invisible bridge */}
            {loginOpen && (
              <div className="absolute top-full left-0 right-0 h-3 pointer-events-auto" style={{
                background: 'transparent'
              }} />
            )}

            <AnimatePresence>
              {loginOpen && (
                <>
                  {/* Pointer Arrow */}
                  <motion.div
                    initial={{ opacity: 0, translateY: -10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-8 z-50 pointer-events-none"
                    style={{ top: '48px' }}
                  >
                    <div 
                      className="w-0 h-0"
                      style={{
                        borderLeft: '7px solid transparent',
                        borderRight: '7px solid transparent',
                        borderBottom: '8px solid rgb(255, 255, 255)',
                        filter: '0 4px 12px rgba(11,42,74,0.08)'
                      }}
                    />
                  </motion.div>

                  {/* Dropdown Panel */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl z-50 py-2 border border-slate-200/50"
                    style={{
                      boxShadow: '0 12px 40px rgba(11,42,74,0.12), 0 4px 12px rgba(11,42,74,0.08)'
                    }}
                    onPointerEnter={handleLoginEnter}
                    onPointerLeave={handleLoginLeave}
                  >
                    <button
                      onClick={() => handleNavigate("/login")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150 text-left"
                    >
                      <LogIn className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Pros Login</div>
                        <div className="text-xs text-foreground/50">Personal account</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleNavigate("/admin/login")}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150 text-left"
                    >
                      <Home className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Homeowner Login</div>
                        <div className="text-xs text-foreground/50">Admin portal</div>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <Button
            size="sm"
            onClick={() => navigate("/join")}
            className={`rounded-full px-5 transition-all duration-200 font-semibold ${
              isHeroPage
                ? "bg-[#0b2a4a] text-white hover:bg-[#0a1f35] border border-[#0b2a4a]"
                : "bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg"
            }`}
          >
            Join As a Pro
          </Button>
        </div>

        <button className={`lg:hidden p-2 rounded-lg transition-colors ${
          isHeroPage
            ? "text-white hover:bg-white/10"
            : "text-foreground hover:bg-accent"
        }`} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={`lg:hidden border-t transition-colors ${
              isHeroPage
                ? "border-white/10 bg-black/10 backdrop-blur-xl"
                : "border-border/50 bg-background/95 backdrop-blur-xl"
            } px-6 py-5 space-y-1 overflow-hidden`}
          >
            <Link to="/services" className={`block py-3 text-sm font-medium transition-colors ${
              isHeroPage
                ? "text-white/80 hover:text-white"
                : "text-foreground/80 hover:text-primary"
            }`} onClick={() => setMobileOpen(false)}>Find a Pro</Link>
            <Link to="/about" className={`block py-3 text-sm font-medium transition-colors ${
              isHeroPage
                ? "text-white/80 hover:text-white"
                : "text-foreground/80 hover:text-primary"
            }`} onClick={() => setMobileOpen(false)}>About</Link>
            <Link to="/cost-guide" className={`block py-3 text-sm font-medium transition-colors ${
              isHeroPage
                ? "text-white/80 hover:text-white"
                : "text-foreground/80 hover:text-primary"
            }`} onClick={() => setMobileOpen(false)}>Portfolio</Link>
            <Link to="/experiences" className={`block py-3 text-sm font-medium transition-colors ${
              isHeroPage
                ? "text-white/80 hover:text-white"
                : "text-foreground/80 hover:text-primary"
            }`} onClick={() => setMobileOpen(false)}>Experiences</Link>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" size="sm" className={`flex-1 rounded-full ${
                isHeroPage ? "border-white text-white hover:bg-white/10" : ""
              }`} onClick={() => { navigate("/admin/login"); setMobileOpen(false); }}>Pros Login</Button>
              <Button variant="outline" size="sm" className={`flex-1 rounded-full ${
                isHeroPage ? "border-white text-white hover:bg-white/10" : ""
              }`} onClick={() => { navigate("/login"); setMobileOpen(false); }}>Login</Button>
            </div>
            <Button size="sm" className={`w-full rounded-full ${
              isHeroPage ? "" : ""
            }`} onClick={() => { navigate("/join"); setMobileOpen(false); }}>Join As a Pro</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
