import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, ArrowRight, Building2, Wrench, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const tradeCategories = [
  "General Contractor & Remodeling",
  "Roofing & Gutters",
  "Carpentry & Millwork",
  "Flooring & Tile",
  "Painting & Wallcovering",
  "Drywall & Plastering",
  "Decks & Outdoor Living",
  "Other Construction Trade",
];

const Join = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    zipCode: "",
    trade: tradeCategories[0],
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitted(true);
    toast.success("Registration request received! Accessing contractor portal...");
  };

  return (
    <Layout>
      <div className="bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" /> FOR US CONSTRUCTION CONTRACTORS
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              Partner with <span className="text-primary">H &amp; A Construction LLC</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Join our team of general contractors, remodelers, roofers, painters, and trade pros managing residential construction projects across Southern Maine.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column - Benefits */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Partner with H &amp; A Construction LLC</h2>
              <p className="text-slate-600 leading-relaxed">
                Everything you need to capture local job requests, send fast estimates, track client payments, log job expenses, and export tax-ready reports.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: "Local Construction Leads",
                  desc: "Get verified job inquiries directly from homeowners in your target ZIP codes.",
                },
                {
                  title: "Smart Estimate Assistant",
                  desc: "Create professional line-item estimates in minutes and send public approval links.",
                },
                {
                  title: "Client Receipts & Payments",
                  desc: "Track paid balances, issue printable digital receipts, and record payment history.",
                },
                {
                  title: "Expense & Tax Management",
                  desc: "Log job materials, sub-contractor reimbursements, and export Schedule C tax reports.",
                },
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{benefit.title}</h4>
                    <p className="text-sm text-slate-600 mt-0.5">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Looking for pricing plans?</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">Starter from $29/mo • Pro at $79/mo</p>
              </div>
              <Link to="/pricing">
                <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 font-bold rounded-xl">
                  View Plans
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - Registration Form */}
          <div className="lg:col-span-6">
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-8">
                <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> Contractor Onboarding
                </div>
                <CardTitle className="text-2xl font-bold">Register Your Business</CardTitle>
                <CardDescription className="text-slate-400">
                  Fill out your business info to get instant access to the H-A Construction partner platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {isSubmitted ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Welcome to H-A Construction!</h3>
                    <p className="text-slate-600 max-w-sm mx-auto text-sm">
                      Your business profile has been registered. You can now access your contractor portal or log in to manage your operations.
                    </p>
                    <div className="pt-4 flex flex-col gap-3">
                      <Button
                        onClick={() => navigate("/admin")}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                      >
                        Go to Contractor Admin Panel <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/admin/login")}
                        className="w-full h-12 rounded-xl font-bold"
                      >
                        Pro Admin Login
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="font-semibold text-slate-900">Company / Business Name *</Label>
                      <Input
                        id="businessName"
                        required
                        placeholder="e.g. Apex Remodeling & Roofing LLC"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName" className="font-semibold text-slate-900">Contact Name</Label>
                        <Input
                          id="contactName"
                          placeholder="John Smith"
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-semibold text-slate-900">Phone Number *</Label>
                        <Input
                          id="phone"
                          required
                          type="tel"
                          placeholder="(555) 000-0000"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-semibold text-slate-900">Email Address *</Label>
                        <Input
                          id="email"
                          required
                          type="email"
                          placeholder="pro@company.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode" className="font-semibold text-slate-900">Target ZIP Code</Label>
                        <Input
                          id="zipCode"
                          placeholder="e.g. 02138"
                          value={formData.zipCode}
                          onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trade" className="font-semibold text-slate-900">Primary Construction Specialty</Label>
                      <select
                        id="trade"
                        value={formData.trade}
                        onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 font-medium"
                      >
                        {tradeCategories.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-600/20 mt-2">
                      Complete Registration <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                      By registering, you agree to receive job leads in your local service area. No credit card required.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Join;
