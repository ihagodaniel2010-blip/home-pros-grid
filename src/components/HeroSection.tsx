import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/navigation-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Play, Lock, CheckCircle2, Home, Users, ShieldCheck, Loader2, Phone, Mail, MessageSquare, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { createLead } from "@/lib/leads";
import { fetchWebsiteSettings, fetchPublicWebsiteCategories, DEFAULT_WEBSITE_SETTINGS, WebsiteSettings, WebsiteCategory } from "@/lib/website-cms";
import { DEFAULT_ORG_ID } from "@/context/UserContext";

const HeroSection = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: "",
    phone: "",
    email: "",
    // Address Info
    streetAddress: "",
    unit: "",
    city: "",
    state: "Maine (ME)",
    zip: "",
    // Service Info
    projectType: "Remodeling",
    description: "",
    // Honeypot
    websiteUrl: ""
  });

  // Contact Preferences
  const [contactPrefs, setContactPrefs] = useState<{
    phone: boolean;
    sms: boolean;
    email: boolean;
    any: boolean;
  }>({
    phone: true,
    sms: true,
    email: true,
    any: true
  });

  useEffect(() => {
    fetchWebsiteSettings(DEFAULT_ORG_ID).then(setSettings).catch(() => {});
    fetchPublicWebsiteCategories(DEFAULT_ORG_ID).then((cats) => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        setFormData(prev => ({ ...prev, projectType: cats[0].name }));
      }
    }).catch(() => {});
  }, []);

  // Handle Contact Preference Checkbox Changes
  const handlePrefToggle = (key: 'phone' | 'sms' | 'email' | 'any') => {
    if (key === 'any') {
      const nextAny = !contactPrefs.any;
      setContactPrefs({
        any: nextAny,
        phone: nextAny,
        sms: nextAny,
        email: nextAny
      });
    } else {
      const nextPrefs = {
        ...contactPrefs,
        [key]: !contactPrefs[key],
        any: false // Automatically uncheck Any Method when a specific option is toggled
      };

      // If all three specific options become checked, auto check 'any'
      if (nextPrefs.phone && nextPrefs.sms && nextPrefs.email) {
        nextPrefs.any = true;
      }

      setContactPrefs(nextPrefs);
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById("hero-estimate-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot Anti-Spam Check
    if (formData.websiteUrl.trim() !== "") {
      setSubmittedSuccess(true);
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter your Phone Number.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Please enter a valid Email Address.");
      return;
    }
    if (!formData.streetAddress.trim()) {
      toast.error("Please enter your Street Address.");
      return;
    }
    if (!formData.city.trim()) {
      toast.error("Please enter your City.");
      return;
    }
    if (!formData.zip.trim()) {
      toast.error("Please enter your ZIP Code.");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please describe your project requirements.");
      return;
    }

    // Validate Contact Preference Selection
    if (!contactPrefs.phone && !contactPrefs.sms && !contactPrefs.email && !contactPrefs.any) {
      toast.error("Please select at least one contact preference.");
      return;
    }

    // Format selected contact methods
    const selectedPrefsList: string[] = [];
    if (contactPrefs.any) {
      selectedPrefsList.push("Any Method");
    } else {
      if (contactPrefs.phone) selectedPrefsList.push("Phone Call");
      if (contactPrefs.sms) selectedPrefsList.push("SMS / Text Message");
      if (contactPrefs.email) selectedPrefsList.push("Email");
    }

    const fullAddress = `${formData.streetAddress.trim()}${formData.unit.trim() ? ' Unit/Ste ' + formData.unit.trim() : ''}, ${formData.city.trim()}, ${formData.state.trim()} ${formData.zip.trim()}`;

    const formattedDetails = [
      `PROJECT DESCRIPTION: ${formData.description.trim()}`,
      `STREET ADDRESS: ${formData.streetAddress.trim()}`,
      `UNIT/SUITE: ${formData.unit.trim() || 'N/A'}`,
      `CITY/STATE/ZIP: ${formData.city.trim()}, ${formData.state.trim()} ${formData.zip.trim()}`,
      `PREFERRED CONTACT: ${selectedPrefsList.join(', ')}`,
      `LEAD SOURCE: Homepage — Hero Estimate Form`
    ].join('\n');

    setIsSubmitting(true);
    try {
      const clientAnswersPayload = {
        street_address: formData.streetAddress.trim(),
        unit: formData.unit.trim() || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        preferred_contact_methods: selectedPrefsList,
        project_type: formData.projectType,
        project_description: formData.description.trim()
      };

      await createLead({
        organization_id: DEFAULT_ORG_ID,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: fullAddress,
        street_address: formData.streetAddress.trim(),
        unit: formData.unit.trim() || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        zip: formData.zip.trim(),
        serviceSlug: formData.projectType.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        selectedServiceOption: formData.projectType,
        details: formattedDetails,
        description: formData.description.trim(),
        locationType: "Residential Property",
        selectedPros: [],
        status: "New",
        ownerNotes: "Lead captured via Homepage Hero Form.",
        preferred_contact_methods: selectedPrefsList,
        preferred_contact_method: contactPrefs.phone ? "phone" : contactPrefs.email ? "email" : "text",
        lead_source: "Homepage — Hero Estimate Form",
        clientAnswers: clientAnswersPayload
      });

      setSubmittedSuccess(true);
      toast.success("Estimate request sent successfully! We will contact you shortly.");
      
      // Reset form
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        streetAddress: "",
        unit: "",
        city: "",
        state: "Maine (ME)",
        zip: "",
        projectType: categories[0]?.name || "Remodeling",
        description: "",
        websiteUrl: ""
      });
    } catch (err: any) {
      console.error("Hero Lead Submit Error:", err);
      toast.error(err?.message || "Failed to submit request. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative bg-slate-900 text-white min-h-[700px] flex flex-col justify-between overflow-hidden">
      {/* Background Image with Dark Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={settings.hero_image_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"}
          alt="H & A Construction Southern Maine Project"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Left Text & Call to Action Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-extrabold uppercase tracking-wider text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              SOUTHERN MAINE'S PREMIER CONTRACTOR
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

            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl font-normal">
              {settings.hero_subheadline}
            </p>

            {/* Buttons Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                onClick={scrollToForm}
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

          {/* Right Lead Capture Form Card (Canonical Refactored Homepage Form) */}
          <div className="lg:col-span-6" id="hero-estimate-form">
            <div className="bg-white/91 backdrop-blur-sm text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-white/70">
              <div className="mb-4 border-b border-slate-200/60 pb-3">
                <h2 className="text-2xl font-black tracking-tight text-[#0b2a4a]">
                  Get a Free Estimate
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tell us about your project and we'll get back to you quickly.
                </p>
              </div>

              {submittedSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-emerald-950 text-lg">Request Received!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Thank you! An H &amp; A Construction project manager will review your project details and contact you according to your preferred contact methods.
                  </p>
                  <Button
                    onClick={() => setSubmittedSuccess(false)}
                    variant="outline"
                    className="text-xs font-bold border-emerald-300 text-emerald-900 hover:bg-emerald-100 h-10 mt-2"
                  >
                    Send Another Request
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Honeypot Anti-Spam Field */}
                  <input
                    type="text"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Section 1: Personal Info */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-[#0b2a4a] uppercase tracking-wider block">
                      1. Personal Information
                    </span>
                    <div>
                      <Input
                        placeholder="Full Name *"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                        className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Phone Number *"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                      />
                      <Input
                        type="email"
                        placeholder="Email Address *"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Section 2: Full Project Address */}
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[11px] font-extrabold text-[#0b2a4a] uppercase tracking-wider block">
                      2. Project Address
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Street Address *"
                          value={formData.streetAddress}
                          onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                          required
                          className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Apt/Unit (Opt)"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="City *"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                      />
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="h-10 bg-white border border-slate-200 rounded-md px-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b2a4a] shadow-xs"
                      >
                        <option value="Maine (ME)">Maine (ME)</option>
                        <option value="New Hampshire (NH)">New Hampshire (NH)</option>
                        <option value="Massachusetts (MA)">Massachusetts (MA)</option>
                      </select>
                      <Input
                        placeholder="ZIP Code *"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                        required
                        className="h-10 bg-white border-slate-200 text-xs font-medium focus:bg-white shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Section 3: Service Information */}
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[11px] font-extrabold text-[#0b2a4a] uppercase tracking-wider block">
                      3. Service &amp; Project Info
                    </span>
                    <div>
                      <select
                        value={formData.projectType}
                        onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-md px-3 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b2a4a] shadow-xs"
                      >
                        {categories.length > 0 ? (
                          categories.map((c) => (
                            <option key={c.id || c.slug} value={c.name}>
                              Project Category: {c.name}
                            </option>
                          ))
                        ) : (
                          [
                            "Remodeling", "Framing", "Drywall", "Roofing", "Siding", 
                            "Decks", "Flooring", "Finish Carpentry", "Kitchens", 
                            "Bathrooms", "Home Additions", "Painting", "Doors & Windows", "General Repairs"
                          ].map(pt => (
                            <option key={pt} value={pt}>
                              Project Category: {pt}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <Textarea
                        placeholder="Project Description * (Tell us what you'd like built, remodeled, or repaired)..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        required
                        className="bg-white border-slate-200 text-xs font-medium focus:bg-white resize-none shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Section 4: Contact Preference Selection */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold text-[#0b2a4a] uppercase tracking-wider block mb-1.5">
                      How would you prefer to be contacted? *
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                      <label 
                        onClick={() => handlePrefToggle('phone')}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
                      >
                        {contactPrefs.phone ? <CheckSquare className="w-4 h-4 text-[#ea580c] shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className="truncate">Phone Call</span>
                      </label>

                      <label 
                        onClick={() => handlePrefToggle('sms')}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
                      >
                        {contactPrefs.sms ? <CheckSquare className="w-4 h-4 text-[#ea580c] shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className="truncate">SMS / Text</span>
                      </label>

                      <label 
                        onClick={() => handlePrefToggle('email')}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
                      >
                        {contactPrefs.email ? <CheckSquare className="w-4 h-4 text-[#ea580c] shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className="truncate">Email</span>
                      </label>

                      <label 
                        onClick={() => handlePrefToggle('any')}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors shadow-xs"
                      >
                        {contactPrefs.any ? <CheckSquare className="w-4 h-4 text-[#ea580c] shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className="truncate">Any Method</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-sm h-11 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-3"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      <>
                        Send Request <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 pt-0.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    Your information is secure &amp; never shared. Fast response guarantee.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Feature Badges Bar */}
      <div className="relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10 py-3 px-4 text-xs font-semibold text-slate-200">
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
