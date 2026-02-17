import { Link } from "react-router-dom";
import { topServices } from "@/data/services";

const TopProjects = () => (
  <section className="py-16 px-4">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Our Top Projects</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {topServices.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.slug}
              to={`/quote/${service.slug}`}
              className="group flex flex-col items-center gap-3 p-6 bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-sm font-medium text-center">{service.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

export default TopProjects;
