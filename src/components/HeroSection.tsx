import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/navigation-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Play, Lock, CheckCircle2, Home, Users, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLead } from "@/lib/leads";
import { fetchWebsiteSettings, DEFAULT_WEBSITE_SETTINGS, WebsiteSettings } from "@/lib/website-cms";
import { DEFAULT_ORG_ID } from "@/context/UserContext";

const PROJECT_TYPES = [
  "Remodeling & Additions",
  "Kitchen Renovation",
  "Bathroom Remodel",
  "Deck & Porch Construction",
  "Roofing & Siding",
  "Flooring & Drywall",
  "Finish Carpentry",
  "Other Construction Project"
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    projectType: "Remodeling & Additions",
    address: "Southern Maine",
    description: ""
  });

  useEffect(() => {
    fetchWebsiteSettings(DEFAULT_ORG_ID).then(setSettings).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.email.trim()) {
      toast.error("Please fill in your name, phone number, and email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createLead({
        organization_id: DEFAULT_ORG_ID,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address || "Southern Maine",
        serviceSlug: formData.projectType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        zip: "04072",
        selectedServiceOption: formData.projectType,
        details: formData.description.trim() || `Estimate Request from Homepage (${formData.projectType})`,
        description: formData.description.trim(),
        locationType: "Residential Property",
        selectedPros: [],
        status: "New",
        ownerNotes: "Lead captured directly from Homepage Hero Form.",
        preferred_contact_method: "phone"
      });

      setSubmittedSuccess(true);
      toast.success("Estimate request sent successfully! We will contact you shortly.");
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        projectType: "Remodeling & Additions",
        address: "Southern Maine",
        description: ""
      });
    } catch (err: any) {
      console.error("Hero Lead Submit Error:", err);
      toast.error(err?.message || "Failed to submit request. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative bg-slate-900 text-white min-h-[640px] flex flex-col justify-between overflow-hidden">
      {/* Background Image with Dark Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={settings.hero_image_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"}
          alt="H & A Construction Southern Maine Project"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/80 to-slate-950/45" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Left Text & Call to Action Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-extrabold uppercase tracking-wider text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              SOUTHERN MAINE'S TRUSTED RESIDENTIAL CONSTRUCTION EXPERTS
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white">
              {settings.hero_headline.includes("What's Next") ? (
                <>
                  Build a Better Home for <span className="text-[#ea580c]">What's Next.</span>
                </>
              ) : (
                settings.hero_headline
              )}
            </h1>

            <p className="text-base sm:text-xl text-slate-200 leading-relaxed max-w-2xl font-normal">
              {settings.hero_subheadline}
            </p>

            {/* Buttons Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                onClick={() => navigate("/contact")}
                className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-base px-7 h-13 rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                Get a Free Estimate <ArrowRight className="w-5 h-5" />
              </Button>

              <Button
                onClick={() => navigate("/projects")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md text-white font-bold text-base px-6 h-13 rounded-xl transition-all flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center pl-0.5">
                  <Play className="w-3.5 h-3.5 fill-slate-900 text-slate-900" />
                </div>
                Watch Our Work
              </Button>
            </div>
          </div>

          {/* Right Lead Capture Form Card (Reference Design Reproduction) */}
          <div className="lg:col-span-5">
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100">
              <h2 className="text-2xl font-black tracking-tight text-[#0b2a4a] mb-1">
                Get a Free Estimate
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Tell us about your project and we'll get back to you quickly.
              </p>

              {submittedSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-emerald-950 text-lg">Request Received!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Thank you! An H &amp; A Construction project manager will review your details and contact you shortly.
                  </p>
                  <Button
                    onClick={() => setSubmittedSuccess(false)}
                    variant="outline"
                    className="text-xs font-bold border-emerald-300 text-emerald-900 hover:bg-emerald-100 h-9 mt-2"
                  >
                    Send Another Request
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <Input
                      placeholder="👤 Your Name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      className="h-11 bg-slate-50 border-slate-200 text-sm font-medium focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="📞 Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="h-11 bg-slate-50 border-slate-200 text-sm font-medium focus:bg-white"
                    />
                    <Input
                      type="email"
                      placeholder="✉ Email Address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-11 bg-slate-50 border-slate-200 text-sm font-medium focus:bg-white"
                    />
                  </div>

                  <div>
                    <select
                      value={formData.projectType}
                      onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2a4a]"
                    >
                      {PROJECT_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          Select Project Type: {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Textarea
                      placeholder="📝 Tell us about your project..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="bg-slate-50 border-slate-200 text-sm font-medium focus:bg-white resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-base h-12 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Sending Request...
                      </>
                    ) : (
                      <>
                        Send Request <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Your information is never shared. We typically respond within 1 business day.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Feature Badges Bar (Exact Reference Match) */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10 py-3.5 px-4 text-xs font-semibold text-slate-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-around gap-4 text-center">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Residential Construction</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Remodeling &amp; Additions</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Proudly Serving Southern Maine</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
