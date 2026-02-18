import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const mockArticles = [
  { id: 1, title: "How Much Does a Kitchen Remodel Cost?", excerpt: "A comprehensive guide to budgeting your kitchen renovation project.", category: "Cost Guide" },
  { id: 2, title: "Top 10 Questions to Ask Your Contractor", excerpt: "Make sure you're hiring the right pro with these essential questions.", category: "Tips" },
  { id: 3, title: "Spring Home Maintenance Checklist", excerpt: "Keep your home in top shape with this seasonal maintenance list.", category: "Maintenance" },
  { id: 4, title: "Energy-Efficient Home Upgrades", excerpt: "Smart improvements that pay for themselves over time.", category: "Savings" },
];

const ArticlesSection = () => (
  <>
    {/* Articles */}
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center mb-14 tracking-tight"
        >
          Articles
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockArticles.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group bg-card rounded-2xl border border-border/60 overflow-hidden premium-shadow hover:premium-shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="h-40 bg-gradient-to-br from-primary/5 to-secondary flex items-center justify-center">
                <span className="text-[10px] font-semibold text-primary/50 uppercase tracking-[0.2em]">{a.category}</span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">{a.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.excerpt}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Mission */}
    <section className="py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center"
      >
        <p className="text-sm leading-[1.8] text-muted-foreground">
          At Networx, our mission is to connect homeowners with qualified local and national home service
          professionals and products they can trust. We make it easy to find the right contractor for any
          project, big or small, so your home stays happy and well-maintained.
        </p>
      </motion.div>
    </section>

    {/* Are you a Pro? */}
    <section className="py-20 px-6 navy-gradient">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center"
      >
        <h3 className="text-2xl font-bold mb-3 text-white">Are you a Pro?</h3>
        <p className="text-sm text-white/60 mb-8 leading-relaxed">
          Join our network of trusted professionals and connect with homeowners looking for your services.
        </p>
        <Link
          to="/join"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
        >
          Join us <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>
  </>
);

export default ArticlesSection;
