import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";
import { Phone, Mail, MapPin, Send, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { SocialMediaBadges } from "@/components/SocialMediaBadges";
import { SMSConsentCheckbox } from "@/components/SMSConsentCheckbox";

export default function Contact() {
  useEffect(() => {
    document.title = `Contact Us | ${siteConfig.businessName}`;
  }, []);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
    websiteUrl: "" // Honeypot
  });

  const [smsConsent, setSmsConsent] = useState<boolean | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.websiteUrl) {
      setIsSuccess(true);
      return;
    }

    if (!formData.fullName.trim() || (!formData.email.trim() && !formData.phone.trim())) {
      setErrorMessage("Please provide your name and at least one contact method (email or phone).");
      return;
    }

    if (smsConsent === null) {
      setSmsError("Please select YES or NO for SMS/Text updates.");
      return;
    }
    setSmsError(null);

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const smsConsentEvidence = {
        smsConsent: smsConsent === true,
        smsConsentTimestamp: now,
        smsConsentTextVersion: "A2P 10DLC Radio Choice v2.0 - 2026-09-29",
        smsConsentPageUrl: typeof window !== "undefined" ? window.location.href : "https://www.h-a-construction.com/contact"
      };

      if (supabase) {
        await supabase.from("leads").insert([
          {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            service_type: formData.subject,
            project_description: `[Subject: ${formData.subject}]\n${formData.message}`,
            status: "new",
            source: "contact_page",
            sms_consent: smsConsent === true,
            sms_consent_timestamp: now,
            sms_consent_text_version: "A2P 10DLC Radio Choice v2.0 - 2026-09-29",
            sms_consent_page_url: typeof window !== "undefined" ? window.location.href : "https://www.h-a-construction.com/contact",
            client_answers: smsConsentEvidence
          }
        ]);
      }

      // Trigger notification email if email provided
      if (formData.email.trim() && formData.email.includes("@")) {
        try {
          await fetch("/api/admin/send-test-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toEmail: formData.email.trim(),
              templateId: "quote_request_received_customer",
              variables: {
                customer_name: formData.fullName.trim(),
                project_type: formData.subject,
                city: "Southern Maine",
                estimate_link: "https://www.h-a-construction.com/contact"
              }
            })
          });
        } catch (err) {
          // Silent fallback
        }
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Contact submit error:", err);
      setErrorMessage("Failed to send message. Please try again or email us directly at info@h-a-construction.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Contact Our Team</h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            Have questions about your project or need customer support? We are here to help. Reach out to {siteConfig.businessName} today.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact Details Column */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">Get in Touch</h2>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Email Support</p>
                    <a href={`mailto:${siteConfig.contactEmail}`} className="text-sky-600 font-medium hover:underline">
                      {siteConfig.contactEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Phone</p>
                    <a href={`tel:${siteConfig.primaryPhone.replace(/[^0-9]/g, '')}`} className="block hover:text-sky-600">
                      {siteConfig.primaryPhone}
                    </a>
                    <a href={`tel:${siteConfig.secondaryPhone.replace(/[^0-9]/g, '')}`} className="block hover:text-sky-600">
                      {siteConfig.secondaryPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Text / SMS Support</p>
                    <a href="sms:+12078198622" className="block hover:text-emerald-600 font-bold text-emerald-700">
                      (207) 819-8622
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Service Area</p>
                    <p className="text-slate-600">Southern Maine (Saco, OOB, Biddeford, Scarborough &amp; surrounding areas)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Business Hours</p>
                    <p className="text-slate-600">Mon - Sat: 7:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Follow &amp; Connect</p>
                <SocialMediaBadges size="md" />
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <p>
                  Looking for refund policies or billing inquiries? Check our{" "}
                  <Link to="/refund-policy" className="text-sky-600 font-semibold hover:underline">
                    Refund &amp; Review Policy
                  </Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form Column */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              {isSuccess ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Message Received!</h3>
                  <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                    Thank you for contacting {siteConfig.businessName}. Our team will review your inquiry and respond promptly.
                  </p>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setSmsConsent(false);
                      setFormData({ fullName: "", email: "", phone: "", subject: "General Inquiry", message: "", websiteUrl: "" });
                    }}
                    className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors text-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Send Us a Message</h2>

                  {/* Honeypot */}
                  <input
                    type="text"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                      {errorMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Your full name"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@example.com"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(207) 000-0000"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Subject
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-sm"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Estimate Support">Estimate &amp; Quote Request</option>
                        <option value="Billing &amp; Refund">Billing / Refund Question</option>
                        <option value="Schedule Project">Project Scheduling</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Message / Project Details
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us how we can help you..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white text-sm"
                    />
                  </div>

                  {/* Twilio A2P 10DLC Compliant SMS Consent Radio Group */}
                  <SMSConsentCheckbox 
                    checked={smsConsent} 
                    onChange={(val) => {
                      setSmsConsent(val);
                      setSmsError(null);
                    }}
                    error={smsError}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
