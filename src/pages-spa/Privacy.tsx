import Layout from "@/components/Layout";
import { ShieldAlert } from "lucide-react";

export default function Privacy() {
  return (
    <Layout>
      <div className="bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Privacy Policy
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
          <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            H-A Construction collects information you provide directly to us when requesting quotes, registering partner accounts, or using our software. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
            <li>Contact details (name, email address, phone number, physical address, ZIP code).</li>
            <li>Project details (service categories, scope of work, budget preferences).</li>
            <li>Contractor business information (company name, specialty, service area radiuses).</li>
            <li>Account credentials and operational data (estimates, job notes, receipt records).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
          <p>
            We use collected information to operate, improve, and personalize H-A Construction, including:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
            <li>Connecting Homeowners with relevant H-A Construction team members and partner Contractors for quote requests.</li>
            <li>Facilitating estimate creation, client receipt delivery, and status notifications.</li>
            <li>Processing project accounts and customer support requests.</li>
            <li>Maintaining platform security, preventing fraud, and ensuring technical reliability.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">3. Lead Data Sharing</h2>
          <p>
            When a Homeowner submits a quote request, project location and contact information are shared with H-A Construction estimators and designated trade specialists in that service area so they can provide project quotes. We do not sell your personal data to unauthorized third-party advertisers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">4. Cookies & Analytics</h2>
          <p>
            We use essential cookies and basic session storage to maintain account authentication, remember language preferences, and analyze anonymized site traffic to optimize user experience.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">5. Data Security & Retention</h2>
          <p>
            We implement industry-standard encryption, SSL protocols, and Row Level Security (RLS) policies to safeguard user data. We retain personal information only as long as necessary to fulfill service operations or comply with legal obligations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">6. Your Rights & Contact</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by contacting our privacy team at: <a href="mailto:info@h-a-construction.com" className="text-blue-600 font-semibold underline">info@h-a-construction.com</a>.
          </p>
        </section>
      </div>
    </Layout>
  );
}
