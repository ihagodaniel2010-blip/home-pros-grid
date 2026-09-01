import Layout from "@/components/Layout";
import { ShieldAlert } from "lucide-react";

export default function Disclaimer() {
  return (
    <Layout>
      <div className="bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Legal Disclaimer
          </h1>
          <p className="text-slate-400 text-sm">Last Updated: September 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-slate-700 leading-relaxed space-y-8 text-sm sm:text-base">
        {/* Attorney Disclaimer Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Operational Notice:</strong> These templates are provided for operational use and should be reviewed by a qualified attorney before public launch.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Software Platform Services</h2>
          <p>
            HomeLeadPro is an independent software technology platform. HomeLeadPro is not a licensed general contractor, architectural firm, engineering firm, legal advisor, Certified Public Accountant (CPA), tax advisory service, or insurance broker.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Financial & Tax Tools Disclaimer</h2>
          <p>
            All financial calculation features, tax center exports, expense tracking tools, and reporting metrics provided within HomeLeadPro are intended solely for organizational and business record-keeping purposes. They do not constitute formal accounting or tax advice. Contractors and business owners should consult a certified CPA or tax professional regarding state and federal tax filings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Estimate & Pricing Disclaimer</h2>
          <p>
            All line items, quantities, pricing totals, labor rates, and project scopes generated using HomeLeadPro software or the AI Estimate Assistant are the sole responsibility of the issuing Contractor. HomeLeadPro assumes no liability for estimate inaccuracies, price fluctuations, or contract disputes between Contractors and Homeowners.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Verification of Contractor Licensing & Insurance</h2>
          <p>
            Homeowners using HomeLeadPro are strongly advised to independently verify contractor state licensing, municipal permits, general liability insurance, and worker's compensation coverage before entering into any binding construction contract or issuing payments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Contact Information</h2>
          <p>
            For questions regarding this Legal Disclaimer, please contact us at: <a href="mailto:info@homeleadpro.com" className="text-blue-600 font-semibold underline">info@homeleadpro.com</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
