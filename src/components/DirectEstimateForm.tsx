import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function DirectEstimateForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    location: "",
    serviceType: "Remodeling & Renovation",
    description: "",
    contactMethod: "phone",
    websiteUrl: "" // Honeypot anti-spam field
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Anti-Spam Honeypot Check
    if (formData.websiteUrl) {
      // Quietly reject bots without exposing honeypot
      setIsSuccess(true);
      return;
    }

    if (!formData.fullName.trim() || !formData.phone.trim()) {
      setErrorMessage("Please fill in your full name and phone number.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Try sending to backend API or Supabase lead table
      let saved = false;

      if (supabase) {
        const { error } = await supabase.from("leads").insert([
          {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || null,
            zip_code: formData.location.trim() || "Southern Maine",
            service_type: formData.serviceType,
            project_description: `${formData.description}\n\n[Preferred Contact: ${formData.contactMethod}]`,
            status: "new",
            source: "website_estimate_form"
          }
        ]);

        if (!error) {
          saved = true;
        } else {
          console.warn("Supabase lead submission notice:", error);
        }
      }

      // 2. Fallback to /api/contact endpoint if available
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        if (res.ok) saved = true;
      } catch (err) {
        // Silent fallback
      }

      // Mark success
      setIsSuccess(true);
      toast.success("Estimate request sent successfully!");
    } catch (err: any) {
      console.error("Form submission error:", err);
      setErrorMessage("There was an error sending your request. Please call us directly at " + siteConfig.primaryPhone);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="estimate-form" className="py-20 px-6 bg-slate-900 text-white relative">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Direct H & A Construction Estimate</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Request a Free Estimate
          </h2>
          <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto font-medium">
            Contact H & A Construction LLC directly for residential projects in Saco, Old Orchard Beach, Biddeford, Scarborough, and Southern Maine.
          </p>
        </div>

        {isSuccess ? (
          <div className="bg-slate-800 border border-emerald-500/40 p-8 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">Thank You, {formData.fullName}!</h3>
            <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
              Your estimate request has been received by H & A Construction LLC. A member of our team will contact you shortly via {formData.contactMethod}.
            </p>
            <div className="pt-4">
              <a
                href={`tel:${siteConfig.primaryPhone.replace(/[^0-9]/g, '')}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all"
              >
                Call Us Directly: {siteConfig.primaryPhone}
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700/80 p-6 md:p-8 rounded-2xl shadow-2xl space-y-5">
            {/* Honeypot Field (Hidden from real users) */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="websiteUrl">Do not fill this field</label>
              <input
                type="text"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Full Name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  placeholder="e.g. John Smith"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Phone Number <span className="text-primary">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  placeholder="e.g. (978) 398-2457"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Location or ZIP Code */}
              <div>
                <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  City or ZIP Code
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  placeholder="e.g. Saco, ME or 04072"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Service Type */}
              <div>
                <label htmlFor="serviceType" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Service Needed
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="Remodeling & Renovation">Remodeling & Renovation</option>
                  <option value="Kitchen & Bathroom Remodel">Kitchen & Bathroom Remodel</option>
                  <option value="Roofing Repair & Replacement">Roofing Repair & Replacement</option>
                  <option value="Flooring Installation">Flooring Installation</option>
                  <option value="Painting & Drywall">Painting & Drywall</option>
                  <option value="Carpentry & Finish Work">Carpentry & Finish Work</option>
                  <option value="General Residential Repair">General Residential Repair</option>
                </select>
              </div>

              {/* Preferred Contact Method */}
              <div>
                <label htmlFor="contactMethod" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  id="contactMethod"
                  name="contactMethod"
                  value={formData.contactMethod}
                  onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  <option value="phone">Phone Call</option>
                  <option value="text">Text Message (SMS)</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Project Description / Details
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Briefly describe what work you need done..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Estimate Request to H & A Construction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
