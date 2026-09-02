import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";

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
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Residential Construction & Remodeling</h2>
          <p>
            {siteConfig.businessName} provides residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Southern Maine.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Estimate & Pricing Disclaimer</h2>
          <p>
            All preliminary line items, project totals, labor estimates, and scope descriptions provided during initial estimate requests or consultations are estimates subject to on-site inspection, material availability, and formal written project agreements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Contact Information</h2>
          <p>
            For questions regarding this Legal Disclaimer, please contact us at:{" "}
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary font-semibold underline">
              {siteConfig.contactEmail}
            </a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
