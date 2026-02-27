import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Check, MapPin, Home, Building2, ChevronRight, Star, Shield, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { getServiceBySlug, getSubServices, type SubServiceOption } from "@/data/services";
import { mockPros } from "@/data/pros";
import { saveLead } from "@/lib/leads";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Loader2 } from "lucide-react";
import { supabase, supabasePublic } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Quote = () => {
  const { serviceSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const service = getServiceBySlug(serviceSlug || "");
  const subServices = getSubServices(serviceSlug || "");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [revealedSections, setRevealedSections] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    zip: searchParams.get("zip") || "",
    city: "",
    state: "",
    selectedService: "",
    subtype: "",
    details: "",
    locationType: "",
    fullName: "",
    address: "",
    email: "",
    phone: "",
    selectedPros: mockPros.map((p) => p.id),
    // Honeypot
    websiteUrl: "",
  });
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const selectedSubService: SubServiceOption | undefined = useMemo(
    () => subServices.find((s) => s.label === formData.selectedService),
    [subServices, formData.selectedService]
  );
  const hasSubtypes = !!(selectedSubService?.subtypes && selectedSubService.subtypes.length > 0);

  // Determine total sections and progress
  const totalSections = hasSubtypes ? 8 : 7;
  const progressPct = Math.min(Math.round((revealedSections / totalSections) * 100), 100);

  const set = (key: string, value: string | string[]) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
  }, []);

  const revealNext = useCallback((sectionIndex: number) => {
    if (sectionIndex >= revealedSections) {
      setRevealedSections(sectionIndex + 1);
      scrollToBottom();
    }
  }, [revealedSections, scrollToBottom]);

  // Calculate section indices dynamically
  const sectionIdx = {
    zip: 0,
    service: 1,
    subtype: hasSubtypes ? 2 : -1,
    details: hasSubtypes ? 3 : 2,
    media: hasSubtypes ? 4 : 3,
    location: hasSubtypes ? 5 : 4,
    contact: hasSubtypes ? 6 : 5,
    review: hasSubtypes ? 7 : 6,
  };

  // Auto-reveal on valid zip
  useEffect(() => {
    if (/^\d{5}$/.test(formData.zip) && revealedSections === 1) {
      setErrors((e) => ({ ...e, zip: "" }));

      // Perform Zip Lookup
      setIsLookupLoading(true);
      fetch(`https://api.zippopotam.us/us/${formData.zip}`)
        .then(res => res.json())
        .then(data => {
          if (data.places && data.places[0]) {
            const place = data.places[0];
            setFormData(prev => ({
              ...prev,
              city: place['place name'],
              state: place['state abbreviation'],
              address: prev.address || ""
            }));
          }
          revealNext(1);
        })
        .catch(() => {
          revealNext(1);
        })
        .finally(() => {
          setIsLookupLoading(false);
        });
    }
  }, [formData.zip, revealedSections, revealNext]);

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
  }, [formData.selectedService, revealedSections, revealNext, subServices]);

  // Auto-reveal on subtype selection
  useEffect(() => {
    if (formData.subtype && hasSubtypes && revealedSections <= 3) {
      revealNext(3);
    }
  }, [formData.subtype, hasSubtypes, revealedSections, revealNext]);

  // Auto-reveal on location type
  useEffect(() => {
    if (formData.locationType) {
      revealNext(sectionIdx.contact);
    }
  }, [formData.locationType, revealNext, sectionIdx.contact]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // 1. Honeypot check
    if (formData.websiteUrl) {
      console.warn("Spam filter triggered: Honeypot filled.");
      toast.success("Request sent successfully!"); // Lie to bots
      navigate("/success");
      return;
    }

    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!supabase) {
        throw new Error("Supabase connection not initialized. Please check your environment variables.");
      }

      // 2. Upload Media
      const uploadedUrls: string[] = [];
      if (selectedMedia.length > 0) {
        setIsUploading(true);
        for (const item of selectedMedia) {
          let fileToUpload = item.file;

          // Compress if image
          if (item.type === 'image') {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            };
            try {
              fileToUpload = await imageCompression(item.file, options);
            } catch (err) {
              console.error("Compression error:", err);
            }
          }

          const fileExt = item.file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const orgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
          const filePath = `${orgId}/${fileName}`;

          const { error: uploadError } = await supabasePublic!.storage
            .from('organization-private')
            .upload(filePath, fileToUpload);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabasePublic!.storage.from('organization-private').getPublicUrl(filePath);
          uploadedUrls.push(publicUrl);
        }
      }

      const selectedProNames = mockPros.filter((p) => formData.selectedPros.includes(p.id)).map((p) => p.name);
      await saveLead({
        serviceSlug: serviceSlug || "",
        zip: formData.zip,
        selectedServiceOption: formData.selectedService,
        subtype: formData.subtype || undefined,
        details: formData.details || undefined,
        locationType: formData.locationType,
        fullName: formData.fullName,
        address: `${formData.address.trim()}${formData.city ? `, ${formData.city.trim()}` : ""}${formData.state ? `, ${formData.state.trim()}` : ""}`,
        email: formData.email,
        phone: formData.phone,
        selectedPros: selectedProNames,
        media_urls: uploadedUrls
      });
      toast.success("Request sent successfully!");
      navigate("/success");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send request. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMedia = files.map(file => {
      const type = file.type.startsWith('image/') ? 'image' : 'video';

      // Video limit check (50MB)
      if (type === 'video' && file.size > 50 * 1024 * 1024) {
        toast.error(`Video ${file.name} is too large. Max limit is 50MB.`);
        return null;
      }

      return {
        file,
        preview: URL.createObjectURL(file),
        type: type as 'image' | 'video'
      };
    }).filter(Boolean) as { file: File; preview: string; type: 'image' | 'video' }[];

    setSelectedMedia(prev => [...prev, ...newMedia]);
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
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
            <h1 className="text-2xl font-bold mb-4">{t("nav.service_not_found")}</h1>
            <button onClick={() => navigate("/services")} className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium">
              {t("nav.browse_services")}
            </button>
          </div>
        </div>
      </>
    );
  }


  // Helper for "proceed" buttons on optional sections
  const handleDetailsContinue = () => {
    revealNext(sectionIdx.media);
  };

  const handleMediaContinue = () => {
    revealNext(sectionIdx.location);
  };

  const handleContactContinue = () => {
    revealNext(sectionIdx.review);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, hsl(209, 75%, 17%) 0%, hsl(209, 80%, 8%) 100%)" }}>
      <Header />

      {/* Progress */}
      <div className="sticky top-[72px] z-40 bg-background/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("nav.back")}
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
          {/* Honeypot - Hidden from humans */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="websiteUrl"
              tabIndex={-1}
              autoComplete="off"
              value={formData.websiteUrl}
              onChange={(e) => set("websiteUrl", e.target.value)}
            />
          </div>

          {/* SECTION 1 – Zip */}
          <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">{t("quote.where_project")}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="zip" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("quote.zip_code")}</Label>
                <div className="relative">
                  <Input
                    id="zip"
                    className="h-14 text-lg tracking-wider text-center bg-secondary/50 border-border rounded-2xl focus:ring-2 focus:ring-primary/30"
                    placeholder="00000"
                    value={formData.zip}
                    onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    onBlur={() => {
                      // Trigger lookup on blur if 5 digits
                      if (/^\d{5}$/.test(formData.zip)) {
                        // Re-trigger the useEffect logic by resetting zip or similar if needed, 
                        // but actually useEffect already handles zip change.
                      }
                    }}
                    maxLength={5}
                  />
                  {isLookupLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                  <ValidIcon valid={/^\d{5}$/.test(formData.zip)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("quote.city")}</Label>
                <Input
                  id="city"
                  className="h-14 bg-secondary/50 border-border rounded-2xl"
                  placeholder={t("quote.city")}
                  value={formData.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("quote.state")}</Label>
                <Input
                  id="state"
                  className="h-14 bg-secondary/50 border-border rounded-2xl"
                  placeholder={t("quote.state")}
                  value={formData.state}
                  onChange={(e) => set("state", e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </div>
            </div>
            {errors.zip && <p className="text-destructive text-xs mt-2">{errors.zip}</p>}
          </motion.section>

          {/* SECTION 2 – Service Type */}
          <AnimatePresence>
            {revealedSections > 1 && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <h2 className="text-xl font-bold tracking-tight mb-6">{t("quote.service_type")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subServices.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { set("selectedService", opt.label); set("subtype", ""); }}
                      className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-200 ${formData.selectedService === opt.label
                        ? "border-primary bg-primary/5 glow-border"
                        : "border-border/60 hover:border-primary/30 hover:bg-card"
                        }`}
                    >
                      <span className="text-sm font-medium">{t(opt.label)}</span>
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
                      className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-200 ${formData.subtype === st
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
                <h2 className="text-xl font-bold tracking-tight mb-2">{t("quote.details_title")}</h2>
                <p className="text-sm text-muted-foreground mb-6">{t("quote.details_desc")}</p>
                <div className="relative">
                  <textarea
                    className="w-full min-h-[120px] p-5 bg-secondary/50 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 resize-none"
                    placeholder={t("quote.details_desc")}
                    value={formData.details}
                    onChange={(e) => set("details", e.target.value)}
                    maxLength={1000}
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] text-muted-foreground">
                    {formData.details.length}/1000
                  </span>
                </div>
                {revealedSections <= sectionIdx.media && (
                  <button
                    onClick={handleDetailsContinue}
                    className="mt-4 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 inline-flex items-center gap-2"
                  >
                    {t("quote.continue")} <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 4.5 – Media Upload */}
          <AnimatePresence>
            {revealedSections > sectionIdx.media && (
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card-strong p-8 md:p-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight mb-2">Add Photos or Videos</h2>
                    <p className="text-sm text-muted-foreground">Show pros what needs to be done for a more accurate estimate.</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {selectedMedia.map((item, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                      {item.type === 'image' ? (
                        <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                          <VideoIcon className="h-8 w-8 text-white/40" />
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {selectedMedia.length < 10 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleMediaChange}
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-white/40" />
                          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Add Media</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-6">
                  <Shield className="h-3.5 w-3.5" />
                  Your files are secure and only shared with selected professionals. Max 50MB per video.
                </div>

                {revealedSections <= sectionIdx.location && (
                  <button
                    onClick={handleMediaContinue}
                    className="px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 inline-flex items-center gap-2"
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
                      className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200 ${formData.locationType === opt.value
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
                <h2 className="text-xl font-bold tracking-tight mb-2">{t("quote.contact_title")}</h2>
                <p className="text-sm text-muted-foreground mb-6">{t("quote.contact_desc")}</p>
                <div className="space-y-4">
                  {[
                    { key: "fullName", label: t("quote.full_name"), type: "text", valid: formData.fullName.trim().length > 0 },
                    { key: "address", label: t("quote.address"), type: "text", placeholder: "Street Name, Number, Apt", valid: formData.address.trim().length > 0 },
                    { key: "email", label: t("quote.email"), type: "email", valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) },
                    { key: "phone", label: t("quote.phone"), type: "tel", valid: /^[\d\s()+-]{7,}$/.test(formData.phone) },
                    { key: "city", label: t("quote.city"), type: "text", valid: formData.city.trim().length > 0 },
                    { key: "state", label: t("quote.state"), type: "text", valid: formData.state.trim().length > 0 },
                  ].map((field) => (
                    <div key={field.key} className="floating-input">
                      <input
                        type={field.type}
                        placeholder={field.placeholder || " "}
                        value={formData[field.key as keyof typeof formData]}
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
                    className="mt-8 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {t("quote.continue")} <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </motion.section>
            )}
          </AnimatePresence>
          {/* SECTION 7 – Review & Submit */}
          <AnimatePresence>
            {revealedSections > sectionIdx.review && (
              <motion.section
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="glass-card-strong p-8 md:p-10"
              >
                <h2 className="text-xl font-bold tracking-tight mb-6">Review & Request Estimate</h2>

                {/* Summary */}
                <div className="bg-secondary/40 rounded-2xl p-5 mb-6 space-y-2.5">
                  {[
                    { label: t("quote.service_type"), value: t(formData.selectedService) },
                    formData.subtype ? { label: "Subtype", value: formData.subtype } : null,
                    { label: t("quote.zip_code"), value: formData.zip },
                    { label: "Location", value: formData.locationType },
                    { label: t("quote.full_name"), value: formData.fullName },
                    { label: t("quote.email"), value: formData.email },
                    { label: t("quote.phone"), value: formData.phone },
                  ].filter(Boolean).map((item) => (
                    <div key={item!.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item!.label}</span>
                      <span className="font-medium">{item!.value || "—"}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed">
                  By clicking "{t("quote.submit")}", you agree to our Terms of Service and Privacy Policy.
                  You consent to receive calls, texts and emails from service professionals at the number
                  and email provided.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-primary-foreground text-base font-semibold rounded-2xl hover:bg-primary/90 transition-all duration-200 hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t("admin.saving") : t("quote.submit")}
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
