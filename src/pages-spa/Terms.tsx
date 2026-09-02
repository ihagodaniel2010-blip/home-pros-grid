import Layout from "@/components/Layout";
import { ShieldAlert } from "lucide-react";

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
        {/* Attorney Disclaimer Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Operational Notice:</strong> These terms are provided for operational demonstration purposes and should be reviewed and customized by a qualified attorney prior to official commercial launch.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the H-A Construction website, mobile application, software, or services (collectively, the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. Description of Platform</h2>
          <p>
            H-A Construction operates an online construction and software platform that connects homeowners ("Homeowners") seeking construction, remodeling, roofing, flooring, drywall, painting, and carpentry services with H-A Construction and partner service professionals ("Contractors"). H-A Construction also provides business management software tools for partner Contractors to generate estimates, track expenses, record client receipts, and manage project workflows.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Independent Contractors & No Guarantee</h2>
          <p>
            Contractors using H-A Construction are independent business owners and are not employees, partners, agents, or joint venturers of H-A Construction. H-A Construction does not perform illegal or unpermitted services, does not guarantee job performance, pricing, or quality, and does not warrant that any homeowner will hire a specific contractor. Homeowners are solely responsible for evaluating contractors, inspecting licensing, verifying insurance, and approving estimates.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. User Responsibilities & Conduct</h2>
          <p>
            Users are responsible for maintaining the confidentiality of their account credentials and for all activities that occur under their account. You agree to provide accurate, truthful, and up-to-date information when submitting quote requests or creating partner profiles. Fraudulent, deceptive, or abusive activity is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Subscriptions, Fees & Payment Terms</h2>
          <p>
            H-A Construction offers subscription plans and lead acquisition services for Contractors. Subscription fees, features, and pricing structures are displayed on our Pricing page and are subject to change upon notice. All fee terms, billing cycles, and cancellation policies presented during onboarding govern contractor accounts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, H-A Construction and its affiliates, officers, directors, and employees shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the Platform or any interactions between Homeowners and Contractors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">7. Contact Information</h2>
          <p>
            If you have any questions regarding these Terms of Service, please contact us at: <a href="mailto:info@h-a-construction.com" className="text-blue-600 font-semibold underline">info@h-a-construction.com</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
