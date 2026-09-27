import { useNavigate } from "@/lib/navigation-compat";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";

const ServiceAreaSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-slate-900 text-white py-16 px-6 overflow-hidden">
      {/* Coastal Background Image */}
      <div className="absolute inset-0 z-0 opacity-25">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
          alt="Southern Maine Coastline"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Info & Button */}
        <div className="lg:col-span-8 space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
            SERVING SOUTHERN MAINE
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Local Homes. Stronger Communities.
          </h2>
          <p className="text-base text-slate-200 leading-relaxed max-w-2xl">
            We proudly serve homeowners throughout Southern Maine, including Kennebunk, Kennebunkport, Arundel, Biddeford, Saco, Old Orchard Beach, Scarborough, Portland, Westbrook, Wells, and surrounding areas.
          </p>

          <div className="pt-2">
            <Button
              onClick={() => navigate("/contact")}
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-sm px-6 h-11 rounded-xl backdrop-blur-md transition-all flex items-center gap-2"
            >
              View Our Service Area <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right Column: Maine Graphic Card */}
        <div className="lg:col-span-4 flex justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center max-w-xs w-full shadow-xl">
            <div className="w-12 h-12 rounded-full bg-[#ea580c] text-white flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-white text-lg mb-1">
              Southern Maine
            </h3>
            <p className="text-xs text-slate-300">
              York &amp; Cumberland Counties
            </p>
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-1.5 justify-center">
              {["Saco", "Biddeford", "Scarborough", "Portland", "Kennebunk"].map((city) => (
                <span key={city} className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-bold text-amber-300">
                  📍 {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceAreaSection;
