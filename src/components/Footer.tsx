import { Link } from "react-router-dom";
import { siteConfig } from "@/config/site";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Brand & Description */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="text-xl font-extrabold tracking-tight text-white block">
              {siteConfig.businessName}
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Professional residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, Old Orchard Beach, Biddeford, Scarborough, and Southern Maine.
            </p>
            <div className="pt-2 text-xs text-slate-500">
              © {new Date().getFullYear()} {siteConfig.businessName}. All rights reserved.
            </div>
          </div>

          {/* Col 2: Services & Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Direct Contact</h4>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${siteConfig.primaryPhone.replace(/[^0-9]/g, '')}`} className="hover:text-white transition-colors">
                  {siteConfig.primaryPhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${siteConfig.secondaryPhone.replace(/[^0-9]/g, '')}`} className="hover:text-white transition-colors">
                  {siteConfig.secondaryPhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-white transition-colors">
                  {siteConfig.contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2 text-xs text-slate-400">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>Southern Maine</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Service Areas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Primary Service Areas</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Saco, ME</li>
              <li>Old Orchard Beach, ME</li>
              <li>Biddeford, ME</li>
              <li>Scarborough, ME</li>
              <li className="text-xs text-slate-500 italic pt-1">{siteConfig.serviceAreasPlus}</li>
            </ul>
          </div>

          {/* Col 4: Navigation & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Navigation & Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400 mb-4">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/cost-guide" className="hover:text-white transition-colors">Portfolio</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-white transition-colors">Legal Disclaimer</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
