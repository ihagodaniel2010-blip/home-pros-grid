import { useEffect } from "react";
import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";

export default function Privacy() {
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
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm">Last Updated: September 28, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-slate-700 leading-relaxed space-y-8 text-sm sm:text-base">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            {siteConfig.businessName} collects information you provide directly to us when requesting an estimate or contacting our team. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
            <li>Contact details (full name, phone number, email address, city/ZIP code).</li>
            <li>Project details (service category, description of work required).</li>
            <li>SMS opt-in consent and text message communication preferences.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
          <p>
            We use your information exclusively to provide estimate quotes, communicate project details, schedule site visits, send transactional status updates, and execute residential construction and remodeling services in Southern Maine. We do not sell or rent your personal information to third-party marketers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. SMS / Mobile Information Policy</h2>
          <p>
            H &amp; A Construction LLC may collect your mobile phone number and SMS consent information when you request an estimate, contact us, or otherwise opt in to receive text messages. We use this information to send service-related communications such as estimate notifications, scheduling information, project updates, change orders, payment reminders, and related customer service messages.
          </p>
          <p className="font-semibold text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-200">
            Mobile phone numbers, SMS opt-in data, and SMS consent information are not sold, rented, or shared with third parties or affiliates for marketing or promotional purposes.
          </p>
          <p>
            Message frequency varies depending on your project and interactions with H &amp; A Construction LLC. Message and data rates may apply. You may opt out at any time by replying STOP to any text message from us. For assistance, reply HELP or contact us through our website.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Data Security &amp; Protection</h2>
          <p>
            We implement industry-standard encryption, SSL protocols, and secure data storage to safeguard your contact details, SMS consent records, and project information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Your Rights &amp; Contact</h2>
          <p>
            You may request access to, correction of, or deletion of your personal contact data or SMS consent records at any time by emailing us at:{" "}
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary font-semibold underline">
              {siteConfig.contactEmail}
            </a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
