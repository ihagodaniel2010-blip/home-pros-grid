import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/navigation-compat";
import { MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { 
  fetchWebsiteSettings, 
  DEFAULT_WEBSITE_SETTINGS, 
  WebsiteSettings,
  fetchPublicWebsiteCategories,
  getServicesMenuCategories,
  WebsiteCategory
} from "@/lib/website-cms";
import { DEFAULT_ORG_ID } from "@/context/UserContext";
import { SocialMediaBadges } from "@/components/SocialMediaBadges";

const Footer = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [footerCategories, setFooterCategories] = useState<WebsiteCategory[]>([]);

  useEffect(() => {
    fetchWebsiteSettings(DEFAULT_ORG_ID).then(setSettings).catch(() => {});
    fetchPublicWebsiteCategories(DEFAULT_ORG_ID).then(cats => {
      setFooterCategories(getServicesMenuCategories(cats));
    }).catch(() => {});
  }, []);

  return (
    <footer className="bg-[#0b2a4a] text-white pt-16 pb-8 px-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
        
        {/* Column 1: Brand & Bio */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/brand/icon-512.png"
              alt="H&A Construction Emblem"
              className="h-10 w-10 object-contain rounded-xl shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white leading-none">
                H &amp; A <span className="text-slate-300 font-bold">CONSTRUCTION LLC</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase mt-1 text-amber-400">
                SOUTHERN MAINE
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
            Professional residential construction, remodeling, roofing, siding, flooring, and custom finish carpentry serving homeowners across Southern Maine with quality craftsmanship and integrity.
          </p>

          <div className="pt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Follow Our Projects</p>
            <SocialMediaBadges
              facebookUrl={settings.facebook_url}
              instagramUrl={settings.instagram_url}
              tiktokUrl={settings.tiktok_url}
              youtubeUrl={settings.youtube_url}
              facebookEnabled={settings.facebook_enabled !== false}
              instagramEnabled={settings.instagram_enabled !== false}
              tiktokEnabled={settings.tiktok_enabled !== false}
              youtubeEnabled={settings.youtube_enabled !== false}
              size="md"
            />
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-amber-400 mb-4">
            Quick Links
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
            <li><Link to="/projects" className="hover:text-white transition-colors">Projects</Link></li>
            <li><Link to="/reviews" className="hover:text-white transition-colors">Reviews</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Column 3: Our Services */}
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-amber-400 mb-4">
            Our Services
          </h4>
          <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
            {footerCategories.slice(0, 8).map(s => (
              <li key={s.id || s.slug}>
                <Link to={`/services/${s.slug}`} className="hover:text-white transition-colors">{s.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Contact Us */}
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-amber-400 mb-4">
            Contact Us
          </h4>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings.company_address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <a href={`tel:${settings.company_phone}`} className="hover:text-white transition-colors">{settings.company_phone}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <a href={`mailto:${settings.company_email}`} className="hover:text-white transition-colors">{settings.company_email}</a>
            </li>
            <li className="pt-2">
              <button
                onClick={() => navigate("/contact")}
                className="text-xs font-bold text-[#ea580c] hover:underline flex items-center gap-1"
              >
                Get a Free Estimate <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Copyright & Guarantee Bar */}
      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} H &amp; A Construction LLC. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span>Licensed &amp; Insured</span>
          <span>•</span>
          <span>Serving Southern Maine</span>
          <span>•</span>
          <span>Built on Quality, Trust &amp; Relationships</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
