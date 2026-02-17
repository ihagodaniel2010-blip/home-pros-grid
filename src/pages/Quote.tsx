import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import { getServiceBySlug, getSubServices, type SubServiceOption } from "@/data/services";
import { mockPros } from "@/data/pros";
import { saveLead } from "@/lib/leads";

const Quote = () => {
  const { serviceSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const service = getServiceBySlug(serviceSlug || "");
  const subServices = getSubServices(serviceSlug || "");
  const displayPros = mockPros.slice(0, 3);

  const [step, setStep] = useState(0);
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
    selectedPros: [displayPros[0].id],
  });

  const selectedSubService: SubServiceOption | undefined = useMemo(
    () => subServices.find((s) => s.label === formData.selectedService),
    [subServices, formData.selectedService]
  );
  const hasSubtypes = !!(selectedSubService?.subtypes && selectedSubService.subtypes.length > 0);

  const totalSteps = hasSubtypes ? 8 : 7;
  const adjustedCurrent = !hasSubtypes && step > 2 ? step - 1 : step;
  const progressPct = Math.round((adjustedCurrent / (totalSteps - 1)) * 100);

  const set = (key: string, value: string | string[]) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    switch (step) {
      case 0: if (!/^\d{5}$/.test(formData.zip)) e.zip = "Enter a valid 5-digit zip code"; break;
      case 1: if (!formData.selectedService) e.selectedService = "Please select a service"; break;
      case 2: if (hasSubtypes && !formData.subtype) e.subtype = "Please select a subtype"; break;
      case 4: if (!formData.locationType) e.locationType = "Please select a location type"; break;
      case 5: if (!formData.fullName.trim()) e.fullName = "Name is required"; break;
      case 6:
        if (!formData.address.trim()) e.address = "Address is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Enter a valid email";
        break;
      case 7:
        if (!/^[\d\s()+-]{7,}$/.test(formData.phone)) e.phone = "Enter a valid phone number";
        break;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validate()) return;
    if (step === 1 && !hasSubtypes) setStep(3);
    else if (step === 7) handleSubmit();
    else setStep(step + 1);
  };

  const goBack = () => {
    if (step === 3 && !hasSubtypes) setStep(1);
    else if (step > 0) setStep(step - 1);
    else navigate(-1);
  };

  const handleSubmit = () => {
    if (!validate()) return;
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
      selectedPros: formData.selectedPros,
    });
    navigate("/success");
  };

  const togglePro = (id: string) => {
    const current = formData.selectedPros;
    set("selectedPros", current.includes(id) ? current.filter((p) => p !== id) : [...current, id]);
  };

  const RadioList = ({ options, value, onChange, error }: { options: string[]; value: string; onChange: (v: string) => void; error?: string }) => (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
            value === opt
              ? "border-primary bg-primary/5 text-primary font-medium"
              : "border-border hover:border-primary/30"
          }`}
        >
          {opt}
        </button>
      ))}
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );

  const FieldWithCheck = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div className="relative">
      {children}
      {value.trim().length > 0 && (
        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
      )}
    </div>
  );

  const renderStep = () => {
    const serviceName = service?.name || "Service";
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="text-xl font-bold mb-1">Find Reliable Local {serviceName} for Your Project</h2>
            <p className="text-sm text-muted-foreground mb-6">What is the project location?</p>
            <Input
              placeholder="Zip Code"
              value={formData.zip}
              onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="text-center text-lg tracking-widest"
            />
            {errors.zip && <p className="text-destructive text-xs mt-1">{errors.zip}</p>}
          </>
        );
      case 1:
        return (
          <>
            <h2 className="text-xl font-bold mb-4">What type of service do you need?</h2>
            <RadioList
              options={subServices.map((s) => s.label)}
              value={formData.selectedService}
              onChange={(v) => { set("selectedService", v); set("subtype", ""); }}
              error={errors.selectedService}
            />
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-xl font-bold mb-4">What type of {formData.selectedService} service?</h2>
            <RadioList
              options={selectedSubService?.subtypes || []}
              value={formData.subtype}
              onChange={(v) => set("subtype", v)}
              error={errors.subtype}
            />
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-xl font-bold mb-2">Add details for more exact quotes</h2>
            <Textarea
              placeholder="Describe your project (optional)"
              value={formData.details}
              onChange={(e) => set("details", e.target.value)}
              rows={4}
            />
          </>
        );
      case 4:
        return (
          <>
            <h2 className="text-xl font-bold mb-4">What kind of location is this?</h2>
            <RadioList
              options={["Home / Residence", "Business"]}
              value={formData.locationType}
              onChange={(v) => set("locationType", v)}
              error={errors.locationType}
            />
          </>
        );
      case 5:
        return (
          <>
            <h2 className="text-xl font-bold mb-1">Who is the quote for?</h2>
            <p className="text-sm text-muted-foreground mb-6">Get your free quotes now - no obligation</p>
            <FieldWithCheck value={formData.fullName}>
              <Input
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </FieldWithCheck>
            {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
          </>
        );
      case 6:
        return (
          <>
            <h2 className="text-xl font-bold mb-1">Great! Your quote is almost ready</h2>
            <div className="space-y-4 mt-6">
              <FieldWithCheck value={formData.address}>
                <Input placeholder="Address" value={formData.address} onChange={(e) => set("address", e.target.value)} />
              </FieldWithCheck>
              {errors.address && <p className="text-destructive text-xs mt-1">{errors.address}</p>}
              <FieldWithCheck value={formData.email}>
                <Input placeholder="Email" type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} />
              </FieldWithCheck>
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
            </div>
          </>
        );
      case 7:
        return (
          <>
            <h2 className="text-xl font-bold mb-1">Last step to request your free cost estimate</h2>
            <div className="mt-4 space-y-4">
              <Input placeholder="Phone" type="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} />
              {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
              <div className="mt-6">
                <p className="text-sm font-medium mb-3">Select the below pros to receive a custom estimate:</p>
                <div className="space-y-3">
                  {displayPros.map((pro) => (
                    <label
                      key={pro.id}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary/30 transition-colors"
                    >
                      <Checkbox
                        checked={formData.selectedPros.includes(pro.id)}
                        onCheckedChange={() => togglePro(pro.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{pro.company}</span>
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <Star className="h-3 w-3 fill-current" /> {pro.rating}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{pro.city}, {pro.state}</p>
                        <div className="flex gap-1.5 mt-1">
                          {pro.badges.map((b) => (
                            <span key={b} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-secondary rounded text-secondary-foreground">
                              <Shield className="h-2.5 w-2.5" /> {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                By clicking "Compare Prices Now," you agree to our Terms of Service and Privacy Policy.
                You consent to receive calls, texts and emails from service professionals at the number
                and email provided. Message/data rates may apply.
              </p>
            </div>
          </>
        );
    }
  };

  if (!service) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Service Not Found</h1>
            <Button onClick={() => navigate("/services")}>Browse All Services</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-wizard-bg">
      <Header />
      {/* Progress bar */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className="text-xs font-bold text-primary">{progressPct}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Wizard card */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[720px] bg-card rounded-2xl shadow-lg border border-border p-6 md:p-10">
          {renderStep()}

          <div className="flex items-center justify-between mt-8 gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              className="shrink-0 h-11 w-11"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button className="flex-1 h-11" onClick={goNext}>
              {step === 0 ? "Check My Prices" : step === 7 ? "Compare Prices Now" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quote;
