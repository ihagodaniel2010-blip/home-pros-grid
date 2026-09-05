import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "@/lib/navigation-compat";
import { Menu, X, ChevronDown, LogIn, Home, User, LogOut, LayoutDashboard, Check, ChevronRight, Wrench, Building2, DollarSign, Images, Star, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { topServices } from "@/data/services";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { Globe, Languages } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [findProOpen, setFindProOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const findProRef = useRef<HTMLDivElement>(null);
  const findProTimerRef = useRef<any>(null);

  const loginRef = useRef<HTMLDivElement>(null);
  const loginTimerRef = useRef<any>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();
  const { language, setLanguage, t, direction } = useLanguage();

  // Detect if on hero page (homepage)
  const isHeroPage = location.pathname === "/";
  const isNavLinkActive = (path: string) => location.pathname === path || (path === "/" && location.pathname === "/");

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

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
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleFindProEnter = () => {
    if (findProTimerRef.current) clearTimeout(findProTimerRef.current);
    setFindProOpen(true);
  };

  const handleFindProLeave = () => {
    findProTimerRef.current = setTimeout(() => {
      setFindProOpen(false);
    }, 320);
  };

  const handleLoginEnter = () => {
    if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    setLoginOpen(true);
  };

  const handleLoginLeave = () => {
    loginTimerRef.current = setTimeout(() => {
      setLoginOpen(false);
    }, 320);
  };

  const handleFindProClick = (slug: string) => {
    navigate(`/quote/${slug}`);
    setTimeout(() => setFindProOpen(false), 80);
  };

  const handleNavigate = (path: string) => {
    setLoginOpen(false);
    navigate(path);
  };

  useEffect(() => {
    return () => {
      if (findProTimerRef.current) clearTimeout(findProTimerRef.current);
      if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    };
  }, []);

  return (
    <header className={`relative z-50 transition-all duration-300 ${isHeroPage
      ? "bg-transparent"
      : "bg-white shadow-sm border-b border-slate-100/80"
      }`} style={
        isHeroPage ? {} : {
          boxShadow: '0 2px 12px rgba(11,42,74,0.06)'
        }
      }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        {/* Brand Logo Header */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center gap-2">
            <img
              src={isHeroPage ? "/logo-light.svg" : "/logo.svg"}
              alt="H&A Construction LLC"
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className={`hidden lg:flex items-center gap-8 ml-auto mr-8 ${isHeroPage ? "text-white" : ""}`}>
          <div
            ref={findProRef}
            className="relative"
            onPointerEnter={handleFindProEnter}
            onPointerLeave={handleFindProLeave}
          >
            <button
              className={`flex items-center gap-1.5 text-base font-semibold transition-all duration-200 ${findProOpen
                ? isHeroPage
                  ? "text-white/90"
                  : "text-primary bg-primary/5 px-3 py-1.5 rounded-lg"
                : isHeroPage
                  ? "text-white/80 hover:text-white"
                  : "text-foreground/80 hover:text-primary"
                }`}
            >
              {t("nav.find_pro")} <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${findProOpen ? "rotate-180" : ""}`} />
            </button>

            {findProOpen && (
              <div className="absolute top-full left-0 right-0 h-3 pointer-events-auto" style={{ background: 'transparent' }} />
            )}

            <AnimatePresence>
              {findProOpen && (
                <>
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
                        {t("nav.view_all_services")}
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {[
            { to: "/about", label: t("nav.about") },
            { to: "/pricing", label: "Pricing" },
            { to: "/cost-guide", label: t("nav.portfolio") },
            { to: "/reviews", label: t("nav.reviews") },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-base font-semibold transition-colors duration-200 relative ${isNavLinkActive(link.to)
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
                  className={`absolute -bottom-1 left-0 right-0 h-1 rounded-full ${isHeroPage ? "bg-white" : "bg-primary"
                    }`}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className={`hidden lg:flex items-center gap-3 ${isHeroPage ? "text-white" : ""}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 rounded-full px-3 hover:bg-white/10 ${isHeroPage ? "text-white hover:text-white/80 hover:bg-white/10" : "text-foreground/70"}`}
                title={t("nav.language")}
              >
                <Languages className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase">{language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={direction === "rtl" ? "start" : "end"}
              sideOffset={8}
              className="w-56 max-h-[450px] overflow-y-auto rounded-xl shadow-2xl border-slate-200/60 p-1.5 scrollbar-thin z-[100] bg-white text-foreground"
            >
              {[
                { code: "en", label: "English", local: "English" },
                { code: "es", label: "Spanish", local: "Español" },
                { code: "pt", label: "Portuguese", local: "Português" },
              ].map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as any)}
                  className={`flex flex-col items-start cursor-pointer px-4 py-3 rounded-lg transition-colors ${language === lang.code ? "bg-primary/10 text-primary font-medium" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold">{lang.local}</span>
                    {language === lang.code && <Check className="h-4 w-4" />}
                  </div>
                  {lang.code !== "en" && (
                    <span className="text-[10px] text-slate-400 mt-0.5">{lang.label}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            ref={loginRef}
            className="relative"
            onPointerEnter={handleLoginEnter}
            onPointerLeave={handleLoginLeave}
          >
            <Button
              size="sm"
              className={`rounded-full px-5 transition-all duration-200 cursor-pointer ${isHeroPage
                ? "bg-white text-[#0b2a4a] border border-white hover:bg-slate-100 font-bold"
                : `border border-border/60 text-foreground ${loginOpen ? "bg-primary/5 border-primary/40 text-primary" : "hover:border-primary/40"}`
                }`}
              onClick={() => setLoginOpen(!loginOpen)}
              variant={isHeroPage ? undefined : "outline"}
            >
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <span className="max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                </div>
              ) : (
                t("nav.login")
              )}
              <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform duration-200 ${loginOpen ? "rotate-180" : ""}`} />
            </Button>

            {loginOpen && (
              <div className="absolute top-full left-0 right-0 h-3 pointer-events-auto" style={{ background: 'transparent' }} />
            )}

            <AnimatePresence>
              {loginOpen && (
                <>
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
                    <div className="py-1">
                      {user ? (
                        <>
                          <div className="px-4 py-2 border-b border-slate-100 mb-1">
                            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                              {user.organization ? user.organization.name : "Account"}
                            </p>
                            <p className="text-sm font-medium truncate">{user.email}</p>
                          </div>

                          <button
                            onClick={() => handleNavigate("/admin")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-all duration-150 text-left"
                          >
                            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                            <span>{t("nav.admin_panel")}</span>
                          </button>

                          <div className="border-t border-slate-100 mt-1 pt-1">
                            <button
                              onClick={() => { logout(); setLoginOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-150 text-left"
                            >
                              <LogOut className="h-4 w-4 flex-shrink-0" />
                              <span>{t("nav.sign_out")}</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleNavigate("/login")}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150 text-left"
                          >
                            <LogIn className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <div className="font-medium">{t("nav.sign_in")}</div>
                              <div className="text-xs text-foreground/50">{t("nav.customer_portal")}</div>
                            </div>
                          </button>
                          <button
                            onClick={() => handleNavigate("/admin/login")}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150 text-left"
                          >
                            <Home className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <div className="font-medium">{t("nav.admin_login")}</div>
                              <div className="text-xs text-foreground/50">{t("nav.management_portal")}</div>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <Button
            size="sm"
            onClick={() => navigate("/quote/remodeling")}
            className="rounded-full px-5 bg-blue-600 text-white hover:bg-blue-700 shadow-md font-bold"
          >
            Get Free Quote
          </Button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className={`lg:hidden p-2.5 rounded-xl transition-all ${isHeroPage
            ? "text-white bg-white/10 hover:bg-white/20"
            : "text-slate-900 bg-slate-100 hover:bg-slate-200"
          }`} 
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[90] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Premium Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation-menu"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#0b2a4a] text-white z-[100] lg:hidden flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            <div className="p-6">
              {/* Drawer Header with Logo & Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-6">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <img src="/logo-light.svg" alt="H&A Construction Logo" className="h-10 w-auto" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2">
                {[
                  { to: "/services", label: t("nav.find_pro"), icon: Wrench },
                  { to: "/about", label: t("nav.about"), icon: Building2 },
                  { to: "/pricing", label: "Pricing", icon: DollarSign },
                  { to: "/cost-guide", label: t("nav.portfolio"), icon: Images },
                  { to: "/reviews", label: t("nav.reviews"), icon: Star },
                  { to: "/contact", label: "Contact Us", icon: Mail },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="h-5 w-5 text-blue-400" />
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/40" />
                  </Link>
                ))}
              </nav>

              {/* Primary Call To Action */}
              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                <Button
                  onClick={() => { navigate("/quote/remodeling"); setMobileOpen(false); }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white h-13 rounded-xl text-base font-bold shadow-lg shadow-blue-900/40"
                >
                  Request Free Estimate
                </Button>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { navigate("/login"); setMobileOpen(false); }}
                    className="border-white/20 text-white hover:bg-white/10 rounded-xl h-11 text-xs font-semibold"
                  >
                    {t("nav.login")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { navigate("/admin/login"); setMobileOpen(false); }}
                    className="border-white/20 text-white hover:bg-white/10 rounded-xl h-11 text-xs font-semibold"
                  >
                    {t("nav.admin_login")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Compact Language Selector */}
            <div className="p-6 bg-slate-950/50 border-t border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Language</p>
              <div className="flex items-center gap-2">
                {[
                  { code: "en", label: "English 🇺🇸" },
                  { code: "es", label: "Español 🇪🇸" },
                  { code: "pt", label: "Português 🇧🇷" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as any)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      language === lang.code
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;

