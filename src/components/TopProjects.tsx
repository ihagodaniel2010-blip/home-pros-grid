import { Link } from "react-router-dom";
import { topServices } from "@/data/services";
import { motion } from "framer-motion";

const TopProjects = () => (
  <section className="py-20 px-6">
    <div className="max-w-6xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold text-center mb-14 tracking-tight"
      >
        Our Top Projects
      </motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
        {topServices.map((service, i) => {
          const Icon = service.icon;
          return (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link
                to={`/quote/${service.slug}`}
                className="group flex flex-col items-center gap-4 p-7 bg-card rounded-2xl border border-border/60 premium-shadow hover:premium-shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-center text-foreground/80 group-hover:text-primary transition-colors duration-200">{service.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default TopProjects;
