import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const mockArticles = [
  { id: 1, title: "How Much Does a Kitchen Remodel Cost?", excerpt: "A comprehensive guide to budgeting your kitchen renovation project.", category: "Cost Guide" },
  { id: 2, title: "Top 10 Questions to Ask Your Contractor", excerpt: "Make sure you're hiring the right pro with these essential questions.", category: "Tips" },
  { id: 3, title: "Spring Home Maintenance Checklist", excerpt: "Keep your home in top shape with this seasonal maintenance list.", category: "Maintenance" },
  { id: 4, title: "Energy-Efficient Home Upgrades That Save Money", excerpt: "Smart improvements that pay for themselves over time.", category: "Savings" },
];

const ArticlesSection = () => (
  <>
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Articles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockArticles.map((a) => (
            <div key={a.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-36 bg-secondary flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{a.category}</span>
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{a.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Mission */}
    <section className="py-16 px-4 bg-secondary">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          At Networx, our mission is to connect homeowners with qualified local and national home service
          professionals and products they can trust. We make it easy to find the right contractor for any
          project, big or small, so your home stays happy and well-maintained.
        </p>
      </div>
    </section>

    {/* Are you a Pro? */}
    <section className="py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-lg font-bold mb-2">Are you a Pro?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Join our network of trusted professionals and connect with homeowners looking for your services.
        </p>
        <Button asChild>
          <Link to="/join">Join us</Link>
        </Button>
      </div>
    </section>
  </>
);

export default ArticlesSection;
