import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              HomeLeadPro
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              The all-in-one operating platform for US construction & remodeling contractors. Get local leads, send smart estimates, track expenses, and manage client receipts.
            </p>
            <div className="pt-2 text-xs text-slate-500">
              © {new Date().getFullYear()} HomeLeadPro Inc. All rights reserved.
            </div>
          </div>

          {/* Col 2: Public Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">Find a Pro / Services</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors font-semibold text-blue-300">USD Pricing & Plans</Link>
              </li>
              <li>
                <Link to="/cost-guide" className="hover:text-white transition-colors">Portfolio & Cost Guide</Link>
              </li>
              <li>
                <Link to="/experiences" className="hover:text-white transition-colors">Client Reviews</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Contractors */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4">For Contractors</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/join" className="hover:text-white transition-colors font-medium">Join as a Pro (Free Registration)</Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-white transition-colors">Contractor Portal Login</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About HomeLeadPro</Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">Contractor Business Guides</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4">Legal & Trust</h4>
            <ul className="space-y-2.5 text-sm text-slate-400 mb-4">
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
            <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-800 pt-4">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Network Status: Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
