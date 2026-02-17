import { Link } from "react-router-dom";
import { coreServices } from "@/data/services";

const ProjectsList = () => (
  <section className="py-16 px-4 bg-secondary">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Our Projects</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
        {coreServices.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.slug}
              to={`/quote/${service.slug}`}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <Icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">{service.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

export default ProjectsList;
