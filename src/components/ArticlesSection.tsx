import { Link } from "@/lib/navigation-compat";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import ServicesShowcase from "./ServicesShowcase";
import ServiceAreas from "./ServiceAreas";
import GoogleReviews from "./GoogleReviews";

const ArticlesSection = () => (
  <>
    {/* Clean Optional Google Reviews Component */}
    <GoogleReviews />

    {/* Services Showcase */}
    <ServicesShowcase />

    {/* Company Direct Mission & Commitment */}
    <section className="py-16 px-6 bg-white relative">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">
          H & A Construction LLC — Our Commitment to Quality
        </h2>
        <p className="text-slate-700 leading-relaxed max-w-3xl mx-auto text-base">
          At H & A Construction LLC, our mission is to provide homeowners in Southern Maine with professional residential construction, remodeling, roofing, flooring, painting, carpentry, and finish work delivered on time and within budget.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 text-left">
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Direct Communication</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Work directly with our experienced project team from initial estimate to final walkthrough.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Quality Craftsmanship</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Durable materials, precision carpentry, and meticulous finish work on every residential project.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Southern Maine Local</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Proudly serving Saco, Old Orchard Beach, Biddeford, Scarborough, and surrounding coastal communities.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Service Areas Section */}
    <ServiceAreas />
  </>
);

export default ArticlesSection;
