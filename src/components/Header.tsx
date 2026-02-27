import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "@/lib/navigation-compat";
import { Menu, X, ChevronDown, LogIn, Home, User, LogOut, LayoutDashboard, Check } from "lucide-react";
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
    setLoginOpen(false);
    navigate(path);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (findProTimerRef.current) clearTimeout(findProTimerRef.current);
      if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    };
  }, []);

  return (
    <header className={`relative z-50 transition-all duration-300 ${isHeroPage
      ? "bg-transparent"
      : "bg-white shadow-sm border-b border-slate-100/30"
      }`} style={
        isHeroPage ? {} : {
          boxShadow: '0 2px 8px rgba(11,42,74,0.04)'
        }
      }>
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link to="/" className={`text-xl font-bold tracking-tight ${isHeroPage ? "text-white" : "text-primary"
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
            { to: "/cost-guide", label: t("nav.portfolio") },
            { to: "/experiences", label: t("nav.experiences") },
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
          {/* Language Selector */}
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
                { code: "pt", label: "Portuguese", local: "Português" },
                { code: "es", label: "Spanish", local: "Español" },
                { code: "zh", label: "Chinese", local: "中文" },
                { code: "fr", label: "French", local: "Français" },
                { code: "ht", label: "Haitian Creole", local: "Kreyòl" },
                { code: "vi", label: "Vietnamese", local: "Việt" },
                { code: "ar", label: "Arabic", local: "العربية" },
                { code: "ru", label: "Russian", local: "Русский" },
                { code: "hi", label: "Hindi", local: "हिन्दी" },
                { code: "it", label: "Italiano", local: "Italiano" },
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

          {/* Login Dropdown */}
          <div
            ref={loginRef}
            className="relative"
            onPointerEnter={handleLoginEnter}
            onPointerLeave={handleLoginLeave}
          >
            <Button
              size="sm"
              className={`rounded-full px-5 transition-all duration-200 cursor-pointer ${isHeroPage
                ? "bg-white text-[#0b2a4a] border border-white hover:bg-slate-100"
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
                            onClick={() => handleNavigate("/experiences")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-150 text-left"
                          >
                            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                            <span>{t("nav.my_projects")}</span>
                          </button>

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
            onClick={() => navigate("/join")}
            className={`rounded-full px-5 transition-all duration-200 font-semibold ${isHeroPage
              ? "bg-[#0b2a4a] text-white hover:bg-[#0a1f35] border border-[#0b2a4a]"
              : "bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg"
              }`}
          >
            {t("nav.join_pro")}
          </Button>
        </div>

        <button className={`lg:hidden p-2 rounded-lg transition-colors ${isHeroPage
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
            className={`lg:hidden border-t transition-colors ${isHeroPage
              ? "border-white/10 bg-black/10 backdrop-blur-xl"
              : "border-border/50 bg-background/95 backdrop-blur-xl"
              } px-6 py-5 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]`}
          >
            <Link to="/services" className={`block py-3 text-sm font-medium transition-colors ${isHeroPage
              ? "text-white/80 hover:text-white"
              : "text-foreground/80 hover:text-primary"
              }`} onClick={() => setMobileOpen(false)}>{t("nav.find_pro")}</Link>
            <Link to="/about" className={`block py-3 text-sm font-medium transition-colors ${isHeroPage
              ? "text-white/80 hover:text-white"
              : "text-foreground/80 hover:text-primary"
              }`} onClick={() => setMobileOpen(false)}>{t("nav.about")}</Link>
            <Link to="/cost-guide" className={`block py-3 text-sm font-medium transition-colors ${isHeroPage
              ? "text-white/80 hover:text-white"
              : "text-foreground/80 hover:text-primary"
              }`} onClick={() => setMobileOpen(false)}>{t("nav.portfolio")}</Link>
            <Link to="/experiences" className={`block py-3 text-sm font-medium transition-colors ${isHeroPage
              ? "text-white/80 hover:text-white"
              : "text-foreground/80 hover:text-primary"
              }`} onClick={() => setMobileOpen(false)}>{t("nav.experiences")}</Link>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" size="sm" className={`flex-1 rounded-full ${isHeroPage ? "border-white text-white hover:bg-white/10" : ""
                }`} onClick={() => { navigate("/admin/login"); setMobileOpen(false); }}>{t("nav.pros_login")}</Button>
              <Button variant="outline" size="sm" className={`flex-1 rounded-full ${isHeroPage ? "border-white text-white hover:bg-white/10" : ""
                }`} onClick={() => { navigate("/login"); setMobileOpen(false); }}>{t("nav.login")}</Button>
            </div>
            <Button size="sm" className={`w-full rounded-full ${isHeroPage ? "" : ""
              }`} onClick={() => { navigate("/join"); setMobileOpen(false); }}>{t("nav.join_pro")}</Button>

            {/* Mobile Language Selector */}
            <div className={`pt-6 border-t mt-6 box-border pb-4 ${isHeroPage ? "border-white/10" : "border-slate-100"}`}>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { code: "en", label: "EN" },
                  { code: "pt", label: "PT" },
                  { code: "es", label: "ES" },
                  { code: "zh", label: "ZH" },
                  { code: "fr", label: "FR" },
                  { code: "ht", label: "HT" },
                  { code: "vi", label: "VI" },
                  { code: "ar", label: "AR" },
                  { code: "ru", label: "RU" },
                  { code: "hi", label: "HI" },
                  { code: "it", label: "IT" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as any)}
                    className={`text-[10px] font-bold py-2 rounded-lg transition-all ${language === lang.code
                      ? 'bg-primary text-white scale-105 shadow-lg'
                      : isHeroPage
                        ? 'text-white/60 border border-white/20 hover:bg-white/10'
                        : 'text-foreground/60 border border-slate-200 hover:bg-slate-50'
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
