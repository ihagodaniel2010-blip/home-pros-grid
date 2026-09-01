import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  FileText,
  Receipt,
  DollarSign,
  Calculator,
  PieChart,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Inbox,
    title: "Local Lead Dispatch",
    desc: "Receive real-time quote requests submitted by verified homeowners in your designated service ZIP codes.",
  },
  {
    icon: FileText,
    title: "Smart Estimates & PDFs",
    desc: "Generate professional line-item estimates with AI assistance and share interactive public links or PDFs.",
  },
  {
    icon: Receipt,
    title: "Client Receipts",
    desc: "Issue printable digital payment receipts instantly when clients pay deposit or final balances.",
  },
  {
    icon: DollarSign,
    title: "Expense & Reimbursements",
    desc: "Log job materials, vendor invoices, and crew expenses to keep your project profit margins accurate.",
  },
  {
    icon: Calculator,
    title: "Tax Center",
    desc: "Automatically categorize revenue, job expenses, and Schedule C tax deductions for tax season.",
  },
  {
    icon: PieChart,
    title: "Reports & Analytics",
    desc: "Real-time dashboard tracking gross revenue, pending estimates, approved jobs, and net profit margins.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Homeowner Request",
    desc: "Clients request local quotes for roofing, remodeling, carpentry, flooring, or painting.",
  },
  {
    step: "02",
    title: "Instant Lead Match",
    desc: "Qualified contractors receive detailed lead notifications in their HomeLeadPro portal.",
  },
  {
    step: "03",
    title: "Send Estimate Link",
    desc: "Contractor builds a smart estimate and shares a secure online approval link with the client.",
  },
  {
    step: "04",
    title: "Client Approval",
    desc: "Client approves with 1 click. Job is scheduled and client receipts are issued automatically.",
  },
  {
    step: "05",
    title: "Tax-Ready Operations",
    desc: "Expenses, reimbursements, and revenue flow directly into your Tax Center and Reports.",
  },
];

export default function ContractorFeaturesSection() {
  return (
    <div className="bg-white py-20 overflow-hidden">
      {/* How it Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 mb-4">
            <Zap className="w-3.5 h-3.5" /> HOW HOMELEADPRO WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            From Local Lead to Paid Job & Tax Report
          </h2>
          <p className="text-slate-600 text-lg">
            A seamless 5-step operating workflow designed specifically for US construction and trade pros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {howItWorks.map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 relative flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg">
                  STEP {item.step}
                </span>
                <h3 className="font-bold text-slate-900 mt-4 text-base mb-2">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contractor Features Grid */}
      <div className="bg-slate-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> CONTRACTOR OPERATING SYSTEM
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Built for General Contractors, Remodelers & Trade Specialists
            </h2>
            <p className="text-slate-400 text-lg">
              Manage every phase of your construction business from a single mobile-friendly dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition-all shadow-xl group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Pricing CTA Banner */}
          <div className="mt-16 bg-gradient-to-r from-blue-900/40 via-blue-800/20 to-slate-900 p-8 sm:p-12 rounded-3xl border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ready to Scale Your Construction Business?</h3>
              <p className="text-sm text-slate-300">
                Transparent USD pricing starting at $29/mo for Starter and $79/mo for Pro. No long-term contracts.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 shrink-0">
              <Link to="/pricing">
                <Button className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/30">
                  View USD Plans <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/join">
                <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-700 text-white hover:bg-slate-800 font-bold text-base">
                  Join as a Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
