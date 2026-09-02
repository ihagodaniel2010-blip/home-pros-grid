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
          <h2 className="text-xl font-bold text-slate-900">1. Construction & Software Services</h2>
          <p>
            H-A Construction provides construction, remodeling, roofing, flooring, drywall, painting, and carpentry management services. H-A Construction is not a licensed legal advisor, Certified Public Accountant (CPA), tax advisory service, or insurance brokerage.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Financial & Tax Tools Disclaimer</h2>
          <p>
            All financial calculation features, tax center exports, expense tracking tools, and reporting metrics provided within H-A Construction software are intended solely for organizational and business record-keeping purposes. They do not constitute formal accounting or tax advice. Contractors and business owners should consult a certified CPA or tax professional regarding state and federal tax filings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Estimate & Pricing Disclaimer</h2>
          <p>
            All line items, quantities, pricing totals, labor rates, and project scopes generated using H-A Construction software or the AI Estimate Assistant are estimates subject to site inspection and signed project agreements. H-A Construction assumes no liability for estimate variations prior to final contract execution.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Verification of Partner Licensing & Insurance</h2>
          <p>
            Homeowners using H-A Construction are advised to review licensing, municipal permits, general liability insurance, and worker's compensation coverage prior to issuing project deposits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Contact Information</h2>
          <p>
            For questions regarding this Legal Disclaimer, please contact us at: <a href="mailto:info@h-a-construction.com" className="text-blue-600 font-semibold underline">info@h-a-construction.com</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
