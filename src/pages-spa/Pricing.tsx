import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Crown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Essential operations for independent contractors & small crews.",
    features: [
      "Local lead management",
      "Smart estimate builder",
      "Client receipt generator",
      "Customer communications",
      "Public estimate approval link",
      "Standard email support",
    ],
    popular: false,
    cta: "Start 14-Day Free Trial",
    badge: null,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "Complete business operating suite for growing remodeling & construction pros.",
    features: [
      "Everything in Starter, plus:",
      "Expense tracking & receipt capture",
      "Employee & subcontractor reimbursements",
      "Tax Center with Schedule C export",
      "AI-powered Estimate Assistant",
      "Company reports & financial KPIs",
      "Priority customer support",
    ],
    popular: true,
    cta: "Get Started with Pro",
    badge: "MOST POPULAR",
  },
  {
    name: "Growth",
    price: "$149",
    period: "/month",
    description: "Maximum scale for multi-crew general contractors & high-volume teams.",
    features: [
      "Everything in Pro, plus:",
      "Unlimited lead distribution volume",
      "Multi-user team & sub-contractor access",
      "Custom service area radiuses & ZIPs",
      "Dedicated account manager",
      "1-on-1 business onboarding",
      "24/7 VIP priority support",
    ],
    popular: false,
    cta: "Contact Sales / Scale Up",
    badge: "ENTERPRISE READY",
  },
];

export default function Pricing() {
  return (
    <Layout>
      <div className="bg-slate-950 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
              <Zap className="w-3.5 h-3.5" /> TRANSPARENT USD PRICING
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              Transparent Estimates &amp; Services for <span className="text-primary">H &amp; A Construction LLC</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Get clear, honest project estimates and high-quality residential construction services in Southern Maine.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`relative bg-white rounded-3xl p-8 border ${
                plan.popular
                  ? "border-blue-600 shadow-2xl ring-2 ring-blue-600/20 scale-[1.02]"
                  : "border-slate-200 shadow-lg"
              } flex flex-col justify-between`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full tracking-wider shadow">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-500 min-h-[40px]">{plan.description}</p>
                </div>

                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-black tracking-tight text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 font-medium ml-1">{plan.period}</span>
                </div>

                <div className="border-t border-slate-100 pt-6 mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Included Features</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-sm text-slate-700">
                        <div className="rounded-full p-0.5 bg-emerald-100 text-emerald-600 mt-0.5 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <Link to="/join">
                  <Button
                    className={`w-full h-12 rounded-xl text-base font-bold transition-all shadow-md ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {plan.cta} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <p className="text-xs text-center text-slate-400 mt-3">No long term contracts. Cancel anytime.</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Are leads included in my monthly subscription?</h4>
              <p className="text-sm text-slate-600">
                Yes! Depending on your plan, you get direct access to local home service requests submitted by homeowners in your designated ZIP codes.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Can I manage my job expenses and receipts?</h4>
              <p className="text-sm text-slate-600">
                Pro and Growth plans include our full business operations suite: track vendor expenses, record client receipts, process reimbursements, and export tax-ready reports.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">How does client estimate approval work?</h4>
              <p className="text-sm text-slate-600">
                Every estimate generates a secure public link. Clients can review line items, approve online with one click, or download a professional PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
