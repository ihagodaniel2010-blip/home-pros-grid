import { Link } from "react-router-dom";
import { coreServices } from "@/data/services";
import { motion } from "framer-motion";

const ProjectsList = () => (
  <section className="py-20 px-6 bg-secondary/50">
    <div className="max-w-6xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold text-center mb-14 tracking-tight"
      >
        Our Projects
      </motion.h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
        {coreServices.map((service, i) => {
          const Icon = service.icon;
          return (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
            >
              <Link
                to={`/quote/${service.slug}`}
                className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-card hover:premium-shadow transition-all duration-200 group"
              >
                <Icon className="h-4.5 w-4.5 text-primary/60 group-hover:text-primary transition-colors duration-200" strokeWidth={1.5} />
                <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors duration-200">{service.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default ProjectsList;
