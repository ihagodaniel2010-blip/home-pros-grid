import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import Layout from "@/components/Layout";
import { allServices } from "@/data/services";
import { motion } from "framer-motion";

const Services = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const filtered = allServices.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = {
    top: filtered.filter((s) => s.category === "top"),
    core: filtered.filter((s) => s.category === "core"),
    extended: filtered.filter((s) => s.category === "extended"),
  };

  const renderGroup = (title: string, items: typeof filtered) =>
    items.length > 0 ? (
      <div className="mb-12">
        <h2 className="text-lg font-bold mb-5 tracking-tight">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
              >
                <Link
                  to={`/quote/${s.slug}`}
                  className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border/60 premium-shadow hover:premium-shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-200"
                >
                  <Icon className="h-5 w-5 text-primary/70 shrink-0" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{s.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8 tracking-tight">All Services</h1>
        <div className="relative mb-10 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            className="w-full h-12 pl-11 pr-4 bg-card border border-border/60 rounded-2xl text-sm premium-shadow focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300"
            placeholder="Search services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {renderGroup("Top Projects", grouped.top)}
        {renderGroup("Core Services", grouped.core)}
        {renderGroup("More Services", grouped.extended)}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-16">No services found matching "{query}"</p>
        )}
      </div>
    </Layout>
  );
};

export default Services;
