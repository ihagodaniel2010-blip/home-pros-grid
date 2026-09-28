import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "@/lib/navigation-compat";
import { Menu, X, ChevronDown, LogIn, User, LogOut, LayoutDashboard, Check, ArrowRight, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { SocialMediaBadges } from "@/components/SocialMediaBadges";
import { 
  fetchWebsiteSettings, 
  DEFAULT_WEBSITE_SETTINGS, 
  WebsiteSettings,
  fetchPublicWebsiteCategories,
  getServicesMenuCategories,
  WebsiteCategory
} from "@/lib/website-cms";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [menuCategories, setMenuCategories] = useState<WebsiteCategory[]>([]);

  const servicesRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();
  const { t } = useLanguage();

  const orgId = user?.organization?.id || DEFAULT_ORG_ID;

  useEffect(() => {
    fetchWebsiteSettings(orgId).then(setSettings).catch(() => {});
    fetchPublicWebsiteCategories(orgId).then(cats => {
      setMenuCategories(getServicesMenuCategories(cats));
    }).catch(() => {});
  }, [orgId]);

  const isHeroPage = location.pathname === "/";
  const isNavLinkActive = (path: string) => location.pathname === path;

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[76px] flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/icon-512.png"
              alt="H&A Construction LLC Emblem"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-xl shadow-xs transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-tight text-[#0b2a4a] leading-none">
                H &amp; A <span className="text-slate-700 font-bold">CONSTRUCTION LLC</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase mt-1 text-slate-500">
                SOUTHERN MAINE
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Main Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 ml-auto mr-6">
          <Link
            to="/"
            className={`text-sm font-bold transition-colors ${
              isNavLinkActive("/") ? "text-[#0b2a4a]" : "text-slate-600 hover:text-[#0b2a4a]"
            }`}
          >
            Home
          </Link>

          {/* Services Dropdown */}
          <div ref={servicesRef} className="relative">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-[#0b2a4a] transition-colors"
            >
              Services <ChevronDown className={`h-3.5 w-3.5 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
            </button>

            {servicesOpen && (
              <div className="absolute top-full left-0 mt-2 w-60 max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in">
                {menuCategories.map((s) => (
                  <Link
                    key={s.id || s.slug}
                    to={`/services/${s.slug}`}
                    onClick={() => setServicesOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#0b2a4a] transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <Link
                    to="/services"
                    onClick={() => setServicesOpen(false)}
                    className="block px-3 py-2 text-xs font-bold text-[#0b2a4a] hover:bg-blue-50 rounded-lg"
                  >
                    View All Services &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/projects"
            className={`text-sm font-bold transition-colors ${
              isNavLinkActive("/projects") ? "text-[#0b2a4a]" : "text-slate-600 hover:text-[#0b2a4a]"
            }`}
          >
            Projects
          </Link>

          <Link
            to="/reviews"
            className={`text-sm font-bold transition-colors ${
              isNavLinkActive("/reviews") ? "text-[#0b2a4a]" : "text-slate-600 hover:text-[#0b2a4a]"
            }`}
          >
            Reviews
          </Link>

          <Link
            to="/about"
            className={`text-sm font-bold transition-colors ${
              isNavLinkActive("/about") ? "text-[#0b2a4a]" : "text-slate-600 hover:text-[#0b2a4a]"
            }`}
          >
            About
          </Link>

          <Link
            to="/contact"
            className={`text-sm font-bold transition-colors ${
              isNavLinkActive("/contact") ? "text-[#0b2a4a]" : "text-slate-600 hover:text-[#0b2a4a]"
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* Social Icons & Prominent Orange CTA Button */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Social Icons (Bank-Grade Badges) */}
          <div className="flex items-center gap-2 mr-1 border-r border-slate-200 pr-4">
            <SocialMediaBadges
              facebookUrl={settings.facebook_url}
              instagramUrl={settings.instagram_url}
              tiktokUrl={settings.tiktok_url}
              youtubeUrl={settings.youtube_url}
              facebookEnabled={settings.facebook_enabled !== false}
              instagramEnabled={settings.instagram_enabled !== false}
              tiktokEnabled={settings.tiktok_enabled !== false}
              youtubeEnabled={settings.youtube_enabled !== false}
              size="sm"
            />
          </div>

          {/* User Account / Portal dropdown */}
          <div ref={loginRef} className="relative">
            <button
              onClick={() => setLoginOpen(!loginOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-[#0b2a4a] hover:bg-slate-100 transition-colors"
              title="Portal Access"
            >
              <User className="w-5 h-5" />
            </button>

            {loginOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                {user ? (
                  <>
                    <button
                      onClick={() => { setLoginOpen(false); navigate("/admin"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-[#0b2a4a] hover:bg-slate-100 rounded-lg flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Admin Portal
                    </button>
                    <button
                      onClick={() => { logout(); setLoginOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 mt-1 border-t border-slate-100 pt-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setLoginOpen(false); navigate("/login"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Client Portal Login
                    </button>
                    <button
                      onClick={() => { setLoginOpen(false); navigate("/admin/login"); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-[#0b2a4a] hover:bg-blue-50 rounded-lg"
                    >
                      Admin Staff Login
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Prominent Orange CTA Button */}
          <Button
            onClick={() => navigate("/contact")}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm px-6 h-11 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            Get a Free Estimate <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Buttons Area */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Quick Access Portal Button for Smartphone */}
          <button
            onClick={() => navigate(user ? "/admin" : "/admin/login")}
            className="p-2.5 rounded-xl text-[#0b2a4a] bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200/80 flex items-center gap-1.5 font-bold text-xs"
            title="Portal Admin"
          >
            <Shield className="h-4 w-4 text-blue-700" />
            <span className="hidden sm:inline">Portal Admin</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            className="p-2.5 rounded-xl text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0b2a4a] text-white border-t border-slate-800 p-6 space-y-5 shadow-2xl"
          >
            <nav className="flex flex-col space-y-3 font-bold text-base">
              <Link to="/" onClick={() => setMobileOpen(false)} className="hover:text-amber-400">Home</Link>
              <Link to="/services" onClick={() => setMobileOpen(false)} className="hover:text-amber-400">Services</Link>
              <Link to="/projects" onClick={() => setMobileOpen(false)} className="hover:text-amber-400">Projects</Link>
              <Link to="/reviews" onClick={() => setMobileOpen(false)} className="hover:text-amber-400">Reviews</Link>
              <Link to="/about" onClick={() => setMobileOpen(false)} className="hover:text-amber-400">About</Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="hover:text-amber-400">Contact</Link>
            </nav>

            {/* Dedicated Mobile Admin & Client Portal Access Section */}
            <div className="pt-4 border-t border-slate-700/80 space-y-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">Portal &amp; Admin Access</p>
              {user ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/admin"); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-11 rounded-xl flex items-center justify-center gap-2 shadow-md"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Open Admin Portal
                  </button>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="w-full bg-red-950/40 text-red-300 hover:text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 border border-red-900/40"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out ({user.email || user.name})
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/admin/login"); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Shield className="w-4 h-4" /> Portal Admin Login
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/login"); }}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-1.5 border border-white/15"
                  >
                    <User className="w-4 h-4" /> Client Portal
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Social Media</span>
              <SocialMediaBadges
                facebookUrl={settings.facebook_url}
                instagramUrl={settings.instagram_url}
                tiktokUrl={settings.tiktok_url}
                youtubeUrl={settings.youtube_url}
                facebookEnabled={settings.facebook_enabled !== false}
                instagramEnabled={settings.instagram_enabled !== false}
                tiktokEnabled={settings.tiktok_enabled !== false}
                youtubeEnabled={settings.youtube_enabled !== false}
                size="sm"
              />
            </div>

            <Button
              onClick={() => { setMobileOpen(false); navigate("/contact"); }}
              className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-base h-12 rounded-xl shadow-lg mt-2"
            >
              Get a Free Estimate &rarr;
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
