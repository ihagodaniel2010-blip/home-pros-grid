import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Check, MapPin, Home, Building2, ChevronRight, Star, Shield, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { getServiceBySlug, getSubServices, type SubServiceOption } from "@/data/services";
import { mockPros } from "@/data/pros";
import { saveLead } from "@/lib/leads";
import { motion, AnimatePresence } from "framer-motion";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Quote = () => {
  const { serviceSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const service = getServiceBySlug(serviceSlug || "");
  const subServices = getSubServices(serviceSlug || "");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [revealedSections, setRevealedSections] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    zip: searchParams.get("zip") || "",
    selectedService: "",
    subtype: "",
    details: "",
    locationType: "",
    fullName: "",
    address: "",
    email: "",
    phone: "",
    selectedPros: mockPros.map((p) => p.id),
  });

  const selectedSubService: SubServiceOption | undefined = useMemo(
    () => subServices.find((s) => s.label === formData.selectedService),
    [subServices, formData.selectedService]
  );
  const hasSubtypes = !!(selectedSubService?.subtypes && selectedSubService.subtypes.length > 0);

  // Determine total sections and progress
  const totalSections = hasSubtypes ? 8 : 7;
  const progressPct = Math.min(Math.round(((revealedSections - 1) / (totalSections - 1)) * 100), 100);

  const set = (key: string, value: string | string[]) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
  };

  const revealNext = (sectionIndex: number) => {
    if (sectionIndex >= revealedSections) {
      setRevealedSections(sectionIndex + 1);
      scrollToBottom();
    }
  };

  // Auto-reveal on valid zip
  useEffect(() => {
    if (/^\d{5}$/.test(formData.zip) && revealedSections === 1) {
      setErrors((e) => ({ ...e, zip: "" }));
      revealNext(1);
    }
  }, [formData.zip]);

  // Auto-reveal on service selection
  useEffect(() => {
    if (formData.selectedService && revealedSections <= 2) {
      const sub = subServices.find((s) => s.label === formData.selectedService);
      if (sub?.subtypes && sub.subtypes.length > 0) {
        revealNext(2);
      } else {
        // Skip subtype, go to details
        revealNext(2); // This will be details section (index adjusted)
      }
    }
  }, [formData.selectedService]);

  // Auto-reveal on subtype selection
  useEffect(() => {
    if (formData.subtype && hasSubtypes && revealedSections <= 3) {
      revealNext(3);
    }
  }, [formData.subtype]);

  // Auto-reveal on location type
  useEffect(() => {
    if (formData.locationType) {
      const detailsSectionIdx = hasSubtypes ? 4 : 3;
      if (revealedSections <= detailsSectionIdx + 1) {
        revealNext(detailsSectionIdx + 1);
      }
    }
  }, [formData.locationType]);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!/^\d{5}$/.test(formData.zip)) e.zip = "Enter a valid 5-digit zip code";
    if (!formData.selectedService) e.selectedService = "Please select a service";
    if (hasSubtypes && !formData.subtype) e.subtype = "Please select a subtype";
    if (!formData.locationType) e.locationType = "Please select a location type";
    if (!formData.fullName.trim()) e.fullName = "Name is required";
    if (!formData.address.trim()) e.address = "Address is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email";
    if (!/^[\d\s()+-]{7,}$/.test(formData.phone)) e.phone = "Enter a valid phone number";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const selectedProNames = mockPros.filter((p) => formData.selectedPros.includes(p.id)).map((p) => p.name);
    saveLead({
      serviceSlug: serviceSlug || "",
      zip: formData.zip,
      selectedServiceOption: formData.selectedService,
      subtype: formData.subtype || undefined,
      details: formData.details || undefined,
      locationType: formData.locationType,
      fullName: formData.fullName,
      address: formData.address,
      email: formData.email,
      phone: formData.phone,
      selectedPros: selectedProNames,
    });
    navigate("/success");
  };

  const togglePro = (id: string) => {
    const current = formData.selectedPros;
    set("selectedPros", current.includes(id) ? current.filter((p) => p !== id) : [...current, id]);
  };

  const ValidIcon = ({ valid }: { valid: boolean }) => (
    <AnimatePresence>
      {valid && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-1/2 -translate-y-1/2"
        >
          <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-3 w-3 text-green-600" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!service) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Service Not Found</h1>
            <button onClick={() => navigate("/services")} className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              Browse All Services
            </button>
          </div>
        </div>
      </>
    );
  }

  // Calculate section indices dynamically
  const sectionIdx = {
    zip: 0,
    service: 1,
    subtype: hasSubtypes ? 2 : -1,
    details: hasSubtypes ? 3 : 2,
    location: hasSubtypes ? 4 : 3,
    contact: hasSubtypes ? 5 : 4,
    review: hasSubtypes ? 6 : 5,
  };

  // Helper for "proceed" buttons on optional sections
  const handleDetailsContinue = () => {
    const nextIdx = sectionIdx.location;
    revealNext(nextIdx + 1);
  };

  const handleContactContinue = () => {
    revealNext(sectionIdx.review + 1);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, hsl(209, 75%, 17%) 0%, hsl(209, 80%, 8%) 100%)" }}>
      <Header />

      {/* Progress */}
      <div className="sticky top-[72px] z-40 bg-background/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <span className="text-sm font-bold text-white">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-white/60 to-white rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-[820px] space-y-6">

          {/* SECTION 1 – Zip */}
          <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Where is your project located?</h2>
            </div>
            <div className="relative max-w-xs">
              <input
                className="w-full h-14 px-5 text-lg tracking-wider text-center bg-secondary/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300"
                placeholder="Zip Code"
                value={formData.zip}
                onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
              />
              <ValidIcon valid={/^\d{5}$/.test(formData.zip)} />
            </div>
            {errors.zip && <p className="text-destructive text-xs mt-2">{errors.zip}</p>}
          </motion.section>

          {/* SECTION 2 – Service Type */}
          <AnimatePresence>
            {revealedSections > 1 && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-6">What type of service do you need?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subServices.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { set("selectedService", opt.label); set("subtype", ""); }}
                      className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                        formData.selectedService === opt.label
                          ? "border-primary bg-primary/5 glow-border"
                          : "border-border/60 hover:border-primary/30 hover:bg-card"
                      }`}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                      {formData.selectedService === opt.label && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Check className="h-4 w-4 text-primary" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
                {errors.selectedService && <p className="text-destructive text-xs mt-2">{errors.selectedService}</p>}
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 3 – Subtype (Conditional) */}
          <AnimatePresence>
            {hasSubtypes && revealedSections > 2 && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-6">What type of {formData.selectedService}?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSubService?.subtypes?.map((st) => (
                    <button
                      key={st}
                      onClick={() => set("subtype", st)}
                      className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                        formData.subtype === st
                          ? "border-primary bg-primary/5 glow-border"
                          : "border-border/60 hover:border-primary/30 hover:bg-card"
                      }`}
                    >
                      <span className="text-sm font-medium">{st}</span>
                      {formData.subtype === st && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Check className="h-4 w-4 text-primary" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
                {errors.subtype && <p className="text-destructive text-xs mt-2">{errors.subtype}</p>}
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 4 – Details */}
          <AnimatePresence>
            {revealedSections > sectionIdx.details && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-2">Add details for more exact quotes</h2>
                <p className="text-sm text-muted-foreground mb-6">Describe your project so pros can give you a better estimate.</p>
                <div className="relative">
                  <textarea
                    className="w-full min-h-[120px] p-5 bg-secondary/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 resize-none"
                    placeholder="Describe your project (optional)"
                    value={formData.details}
                    onChange={(e) => set("details", e.target.value)}
                    maxLength={1000}
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground">
                    {formData.details.length}/1000
                  </span>
                </div>
                {revealedSections <= sectionIdx.location && (
                  <button
                    onClick={handleDetailsContinue}
                    className="mt-4 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 inline-flex items-center gap-2"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 5 – Location Type */}
          <AnimatePresence>
            {revealedSections > sectionIdx.location && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-6">What kind of location is this?</h2>
                <div className="flex gap-4">
                  {[
                    { value: "Home / Residence", icon: Home, label: "Home" },
                    { value: "Business", icon: Building2, label: "Business" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => set("locationType", opt.value)}
                      className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${
                        formData.locationType === opt.value
                          ? "border-primary bg-primary/5 glow-border"
                          : "border-border/60 hover:border-primary/30"
                      }`}
                    >
                      <opt.icon className={`h-6 w-6 ${formData.locationType === opt.value ? "text-primary" : "text-muted-foreground"} transition-colors`} strokeWidth={1.5} />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {errors.locationType && <p className="text-destructive text-xs mt-2">{errors.locationType}</p>}
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 6 – Contact Info */}
          <AnimatePresence>
            {revealedSections > sectionIdx.contact && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-2">Contact Information</h2>
                <p className="text-sm text-muted-foreground mb-6">Get your free quotes now — no obligation.</p>
                <div className="space-y-4">
                  {[
                    { key: "fullName", label: "Full Name", type: "text", valid: formData.fullName.trim().length > 0 },
                    { key: "address", label: "Address", type: "text", valid: formData.address.trim().length > 0 },
                    { key: "email", label: "Email", type: "email", valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) },
                    { key: "phone", label: "Phone", type: "tel", valid: /^[\d\s()+-]{7,}$/.test(formData.phone) },
                  ].map((field) => (
                    <div key={field.key} className="floating-input">
                      <input
                        type={field.type}
                        placeholder=" "
                        value={(formData as any)[field.key]}
                        onChange={(e) => set(field.key, e.target.value)}
                        className="!rounded-2xl !bg-secondary/50"
                      />
                      <label>{field.label}</label>
                      <ValidIcon valid={field.valid} />
                      {errors[field.key] && <p className="text-destructive text-xs mt-1 pl-1">{errors[field.key]}</p>}
                    </div>
                  ))}
                </div>
                {revealedSections <= sectionIdx.review && (
                  <button
                    onClick={handleContactContinue}
                    className="mt-6 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 inline-flex items-center gap-2"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 7 – Review & Submit */}
          <AnimatePresence>
            {revealedSections > sectionIdx.review && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-6">Review & Get Your Quotes</h2>

                {/* Summary */}
                <div className="bg-secondary/40 rounded-2xl p-5 mb-6 space-y-2.5">
                  {[
                    { label: "Service", value: formData.selectedService },
                    formData.subtype ? { label: "Subtype", value: formData.subtype } : null,
                    { label: "Zip Code", value: formData.zip },
                    { label: "Location", value: formData.locationType },
                    { label: "Name", value: formData.fullName },
                    { label: "Email", value: formData.email },
                    { label: "Phone", value: formData.phone },
                  ].filter(Boolean).map((item) => (
                    <div key={item!.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item!.label}</span>
                      <span className="font-medium">{item!.value || "—"}</span>
                    </div>
                  ))}
                </div>

                {/* Pros selection */}
                <p className="text-sm font-medium mb-4">Select professionals to receive your estimate:</p>
                <div className="space-y-3 mb-6">
                  {mockPros.map((pro) => (
                    <label
                      key={pro.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 card-hover ${
                        formData.selectedPros.includes(pro.id)
                          ? "border-primary bg-primary/5 glow-border"
                          : "border-border/60 hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedPros.includes(pro.id)}
                        onChange={() => togglePro(pro.id)}
                        className="mt-0.5 w-5 h-5 rounded border-border accent-primary cursor-pointer"
                      />
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm">
                        {pro.initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm">{pro.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1.5">{pro.location}, {pro.state}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < Math.round(pro.rating) ? "fill-amber-400 text-amber-400" : "fill-gray-300 text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-medium text-foreground">{pro.rating}</span>
                            <span className="text-xs text-muted-foreground">({pro.reviews})</span>
                          </div>
                          <div className="flex gap-1.5">
                            {pro.badges.map((b) => (
                              <span key={b} className="inline-flex items-center text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed">
                  By clicking "Get My Free Quotes," you agree to our Terms of Service and Privacy Policy.
                  You consent to receive calls, texts and emails from service professionals at the number
                  and email provided.
                </p>

                <button
                  onClick={handleSubmit}
                  className="w-full py-4 bg-primary text-primary-foreground text-base font-semibold rounded-2xl hover:bg-primary/90 transition-all duration-200 hover:shadow-xl active:scale-[0.99]"
                >
                  Get My Free Quotes
                </button>
              </motion.section>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

export default Quote;
