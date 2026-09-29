import { useEffect } from "react";
import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";
import { Link } from "react-router-dom";

export default function Terms() {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, follow");
  }, []);

  return (
    <Layout>
      <div className="bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm">Last Updated: September 28, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-slate-700 leading-relaxed space-y-8 text-sm sm:text-base">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the {siteConfig.businessName} website or submitting an estimate request, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Services &amp; Scope</h2>
          <p>
            {siteConfig.businessName} provides residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, Old Orchard Beach, Biddeford, Scarborough, and surrounding areas in Southern Maine.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Estimate Requests &amp; Communication</h2>
          <p>
            When you submit a free estimate request, you authorize {siteConfig.businessName} to contact you via your preferred contact method (phone, text message, or email) regarding your project specifications and scheduling.
          </p>
        </section>

        <section className="space-y-3 border-l-4 border-amber-500 pl-4 py-1 bg-slate-50 rounded-r-xl">
          <h2 className="text-xl font-bold text-slate-900">4. SMS Messaging Terms &amp; Conditions</h2>
          <p>
            By providing your mobile phone number and expressly opting in, you agree to receive transactional and service-related text messages from H &amp; A Construction LLC. Messages may include estimate notifications, scheduling information, project updates, change orders, payment reminders, and related customer service communications.
          </p>
          <p className="font-semibold text-slate-800">
            Message frequency varies. Message and data rates may apply.
          </p>
          <p>
            Reply <strong>STOP</strong> at any time to opt out of text messages. Reply <strong>HELP</strong> for assistance, or contact H &amp; A Construction LLC through our{" "}
            <Link to="/contact" className="text-sky-600 font-semibold underline">
              Contact Page
            </Link>.
          </p>
          <p>
            Consent to receive text messages is not a condition of purchasing services or receiving an estimate.
          </p>
          <p>
            Mobile opt-in information and consent will not be sold or shared with third parties or affiliates for marketing or promotional purposes. Please review our{" "}
            <Link to="/privacy" className="text-sky-600 font-semibold underline">
              Privacy Policy
            </Link>{" "}
            for full details on data privacy.
          </p>
          <p className="text-xs text-slate-500 italic">
            Wireless carriers are not liable for delayed or undelivered messages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. User Responsibilities</h2>
          <p>
            You agree to provide accurate and truthful contact and project information when submitting estimate requests. Fraudulent or deceptive submissions are strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">6. Contact Information</h2>
          <p>
            If you have any questions regarding these Terms of Service or SMS terms, please reach us through our{" "}
            <Link to="/contact" className="text-primary font-semibold underline">
              Contact Page
            </Link>, email us at{" "}
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary font-semibold underline">
              {siteConfig.contactEmail}
            </a>, or call us directly at {siteConfig.primaryPhone}.
          </p>
        </section>
      </div>
    </Layout>
  );
}
