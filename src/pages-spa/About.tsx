import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Award, ShieldCheck, Clock, MapPin, Phone } from "lucide-react";
import Layout from "@/components/Layout";
import { siteConfig, getPrimaryPhoneLink } from "@/config/site";

const About = () => {
  const values = [
    {
      icon: Award,
      title: "Quality Craftsmanship",
      description: "Durable construction, precision carpentry, and custom remodeling tailored to your residential property."
    },
    {
      icon: ShieldCheck,
      title: "Direct Contractor Communication",
      description: "Deal directly with H & A Construction LLC from initial estimate to project completion — no middleman."
    },
    {
      icon: Clock,
      title: "On-Time Local Service",
      description: "Dedicated residential service throughout Saco, Old Orchard Beach, Biddeford, Scarborough, and Southern Maine."
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white mb-4">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Southern Maine Local Contractor</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              About H & A Construction LLC
            </h1>
            <p className="text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed">
              Providing professional residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, Old Orchard Beach, Biddeford, Scarborough, and surrounding areas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-6 bg-slate-50 border-t border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Our Business Commitment
          </h2>
          <p className="text-slate-700 leading-relaxed text-base italic max-w-2xl mx-auto font-medium">
            At H & A Construction LLC, our mission is to deliver exceptional residential construction and remodeling craftsmanship with direct communication, transparent project estimates, and reliable execution across Southern Maine.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h3 className="text-3xl font-extrabold text-slate-900">
            Ready to Discuss Your Project?
          </h3>
          <p className="text-slate-600 max-w-lg mx-auto text-sm md:text-base">
            Contact H & A Construction LLC today to request a free estimate or speak with our team about your upcoming construction or remodeling project.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="/#estimate-form"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md"
            >
              Request a Free Estimate <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={getPrimaryPhoneLink()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-100 text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all"
            >
              <Phone className="h-4 w-4 text-emerald-600" />
              Call {siteConfig.primaryPhone}
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
