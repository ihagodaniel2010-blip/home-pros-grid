import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { allServices } from "@/data/services";

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
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.slug}
                to={`/quote/${s.slug}`}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:shadow-md hover:border-primary/30 transition-all"
              >
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{s.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">All Services</h1>
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {renderGroup("Top Projects", grouped.top)}
        {renderGroup("Core Services", grouped.core)}
        {renderGroup("More Services", grouped.extended)}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-center py-10">No services found matching "{query}"</p>
        )}
      </div>
    </Layout>
  );
};

export default Services;
