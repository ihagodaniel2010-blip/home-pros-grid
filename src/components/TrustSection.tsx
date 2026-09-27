import { ShieldCheck, Zap, Award, Users, DollarSign, MapPin } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Licensed & Insured",
    description: "Your home is in safe hands"
  },
  {
    icon: Zap,
    title: "Fast Response",
    description: "We return calls quickly"
  },
  {
    icon: Award,
    title: "Quality Craftsmanship",
    description: "Built to last"
  },
  {
    icon: Users,
    title: "Family-Owned",
    description: "Local & trustworthy"
  },
  {
    icon: DollarSign,
    title: "Free Estimates",
    description: "No obligation"
  },
  {
    icon: MapPin,
    title: "Serving Southern Maine",
    description: "Homes, families, communities"
  }
];

const TrustSection = () => {
  return (
    <section className="bg-slate-50 border-b border-slate-200 py-6 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center md:text-left">
        {TRUST_ITEMS.map((item, idx) => (
          <div key={idx} className="flex flex-col md:flex-row items-center md:items-start gap-3 p-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#0b2a4a] flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-[#0b2a4a]" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustSection;
