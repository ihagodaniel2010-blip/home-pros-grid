import { useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, Phone, ArrowRight } from "lucide-react";
import { Link } from "@/lib/navigation-compat";
import { siteConfig } from "@/config/site";

const ServiceAreas = () => {
  const displayAreas = useMemo(() => {
    return siteConfig.serviceAreas;
  }, []);

  return (
    <section className="py-20 px-6 bg-slate-50 relative overflow-hidden border-t border-slate-200/60">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span>Southern Maine Service Areas</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Serving Saco, OOB, Biddeford, Scarborough & Beyond
          </h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto font-medium">
            H & A Construction LLC provides professional residential construction, remodeling, roofing, flooring, painting, and carpentry throughout Southern Maine.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-12 gap-8 items-center">
          {/* Cities Grid */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-7 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Primary Communities Served
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {displayAreas.map((area, i) => (
                <div
                  key={`${area}-${i}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                  <span className="text-slate-800 font-semibold text-sm">{area}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-4">
              {siteConfig.serviceAreasPlus}
            </p>
          </motion.div>

          {/* Contact Card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-5 bg-slate-900 text-white p-8 rounded-2xl shadow-xl space-y-6"
          >
            <div>
              <h4 className="text-xl font-bold mb-2 text-white">Contact H & A Construction LLC</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Contact our local Maine team for a free estimate on your residential project.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={`tel:${siteConfig.primaryPhone.replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all text-sm font-semibold text-white"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span>Call {siteConfig.primaryPhone}</span>
              </a>

              <a
                href={`tel:${siteConfig.secondaryPhone.replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all text-sm font-semibold text-white"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span>Call {siteConfig.secondaryPhone}</span>
              </a>

              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 rounded-xl transition-all text-sm font-semibold text-white"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="truncate">{siteConfig.contactEmail}</span>
              </a>
            </div>

            <div className="pt-2">
              <a
                href="#estimate-form"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md"
              >
                Request a Free Estimate
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ServiceAreas;
