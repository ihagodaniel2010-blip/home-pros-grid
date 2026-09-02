import Layout from "@/components/Layout";
import { siteConfig } from "@/config/site";

export default function Terms() {
  return (
    <Layout>
      <div className="bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm">Last Updated: September 2026</p>
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
          <h2 className="text-xl font-bold text-slate-900">2. Services & Scope</h2>
          <p>
            {siteConfig.businessName} provides residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, Old Orchard Beach, Biddeford, Scarborough, and surrounding areas in Southern Maine.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Estimate Requests & Communication</h2>
          <p>
            When you submit a free estimate request, you authorize {siteConfig.businessName} to contact you via your preferred contact method (phone, text message, or email) regarding your project specifications and scheduling.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. User Responsibilities</h2>
          <p>
            You agree to provide accurate and truthful contact and project information when submitting estimate requests. Fraudulent or deceptive submissions are strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Contact Information</h2>
          <p>
            If you have any questions regarding these Terms of Service, please contact us at:{" "}
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary font-semibold underline">
              {siteConfig.contactEmail}
            </a>{" "}
            or call us at {siteConfig.primaryPhone}.
          </p>
        </section>
      </div>
    </Layout>
  );
}
