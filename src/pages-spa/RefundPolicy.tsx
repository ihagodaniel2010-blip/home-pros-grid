import { useEffect } from "react";
import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";
import { ShieldCheck, Mail, AlertCircle, RefreshCw } from "lucide-react";

export default function RefundPolicy() {
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
            Refund & Credit Policy
          </h1>
          <p className="text-slate-300 text-sm">Last Updated: September 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-slate-700 leading-relaxed space-y-10 text-sm sm:text-base">
        {/* Section 1: Overview */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <RefreshCw className="w-5 h-5 text-sky-600 shrink-0" />
            <h2>1. Lead Credits & Billing Overview</h2>
          </div>
          <p>
            {siteConfig.businessName} provides an online credit top-up system allowing eligible business accounts to purchase lead credits. These credits are used exclusively within our platform to acquire homeowner estimate requests and project inquiries in Southern Maine.
          </p>
        </section>

        {/* Section 2: Non-Refundable Credit Usage */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
            <h2>2. Credit Usage & Non-Refundable Items</h2>
          </div>
          <p>
            Once lead credits are redeemed or spent to acquire a specific project inquiry, those credits are considered fully used and non-refundable. {siteConfig.businessName} does not guarantee that a lead will result in a signed contract or closed transaction, as final project agreements depend entirely on independent contractor proposals and homeowner decisions.
          </p>
        </section>

        {/* Section 3: Eligible Refund & Adjustment Cases */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0" />
            <h2>3. Eligible Refund & Adjustment Requests</h2>
          </div>
          <p>
            Refunds or account credit adjustments may be granted under the following documented circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>Technical billing errors or accidental duplicate checkout transactions.</li>
            <li>Verified system failure preventing credit deposit after payment completion.</li>
            <li>Proven duplicate lead distribution caused by internal platform processing errors.</li>
          </ul>
        </section>

        {/* Section 4: Request Process & Resolution */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <Mail className="w-5 h-5 text-sky-600 shrink-0" />
            <h2>4. Request Process & Customer Support</h2>
          </div>
          <p>
            To request a credit review or refund assessment, please contact our support team prior to initiating any bank chargeback or dispute. We endeavor to review and resolve all billing inquiries within 2 to 3 business days.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1">
            <p className="font-semibold text-sm">Official Support Email:</p>
            <a href="mailto:info@h-a-construction.com" className="text-sky-600 font-bold hover:underline">
              info@h-a-construction.com
            </a>
          </div>
        </section>

        {/* Section 5: Disclaimers */}
        <section className="pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-2">
          <p>
            <strong>Legal Disclaimer:</strong> This Refund Policy is provided for informational and operational clarity regarding lead credit top-ups for {siteConfig.businessName}. {siteConfig.businessName} reserves the right to adjust user balances or issue promotional account credits at its sole discretion.
          </p>
        </section>
      </div>
    </Layout>
  );
}
