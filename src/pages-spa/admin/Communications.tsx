import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { COMMUNICATION_TEMPLATES, CommunicationTemplate } from "@/lib/communicationTemplates";
import { toast } from "sonner";
import { 
  Mail, Copy, Check, Eye, AlertCircle, Info, Sparkles, Code2, 
  Send, Users, Building, ShieldCheck, Loader2, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Communications() {
  const { user } = useUser();
  const isWorker = user?.organization?.role === 'worker';
  const navigate = useNavigate();

  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate>(COMMUNICATION_TEMPLATES[0]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"text" | "html" | "vars" | "test">("text");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Resend Provider State (Fase 9.1)
  const [providerStatus, setProviderStatus] = useState<{ configured: boolean; provider: string; fromEmail: string }>({
    configured: false,
    provider: "Resend",
    fromEmail: "H&A Construction <no-reply@h-a-construction.com>"
  });
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [testVars, setTestVars] = useState<Record<string, string>>({});
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email-provider-status")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.configured === 'boolean') {
          setProviderStatus(data);
        }
      })
      .catch(err => {
        console.warn("Provider status check failed:", err);
      });
  }, []);

  useEffect(() => {
    // Populate default test variables when template changes
    const initialVars: Record<string, string> = {};
    selectedTemplate.variables.forEach(v => {
      initialVars[v] = `[Sample ${v}]`;
    });
    setTestVars(initialVars);
  }, [selectedTemplate]);

  if (isWorker) {
    navigate("/admin");
    return null;
  }

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          toEmail: testEmail,
          variables: testVars
        })
      });

      const result = await response.json();

      if (!result.configured) {
        toast.warning(result.message || "RESEND_API_KEY is not configured in environment variables.");
      } else if (result.success) {
        toast.success(`Test email sent successfully! Message ID: ${result.messageId || 'OK'}`);
      } else {
        toast.error(result.message || "Failed to send test email.");
      }
    } catch (err: any) {
      console.error("Test email dispatch error:", err);
      toast.error(err.message || "Network error dispatching test email.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredTemplates = COMMUNICATION_TEMPLATES.filter(t => {
    if (filterCategory === "all") return true;
    return t.category === filterCategory;
  });

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Mail className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            Communication Templates & Messaging
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            System email and notification templates for customers, leads, estimates, receipts, and internal alerts.
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border ${
          providerStatus.configured 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}>
          {providerStatus.configured ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Resend Provider Active ({providerStatus.fromEmail})</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Resend Provider Not Configured (RESEND_API_KEY needed)</span>
            </>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Template Selection */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Category Filter Pills */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-2 shadow-sm flex items-center gap-1">
            <button
              onClick={() => setFilterCategory("all")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                filterCategory === "all" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              All ({COMMUNICATION_TEMPLATES.length})
            </button>
            <button
              onClick={() => setFilterCategory("customer")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                filterCategory === "customer" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => setFilterCategory("company")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                filterCategory === "company" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Company
            </button>
            <button
              onClick={() => setFilterCategory("internal")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                filterCategory === "internal" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Internal
            </button>
          </div>

          {/* Template List */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-3 shadow-sm space-y-2 max-h-[600px] overflow-y-auto">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate.id === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-transparent hover:bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      template.category === 'customer' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      template.category === 'company' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {template.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {template.variables.length} vars
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {template.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-medium">
                    {template.preview}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Template Inspector & Preview */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Template Details
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedTemplate.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {selectedTemplate.preview}
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                ID: {selectedTemplate.id}
              </span>
            </div>

            {/* Subject Line */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject Line</label>
                <button
                  onClick={() => copyToClipboard(selectedTemplate.subject, "subject", "Subject line")}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  {copiedKey === "subject" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Subject
                </button>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm">
                {selectedTemplate.subject}
              </div>
            </div>

            {/* Tab Controls */}
            <div className="flex border-b border-slate-200 mb-4">
              <button
                onClick={() => setActiveTab("text")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "text" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Plain Text Body
              </button>
              <button
                onClick={() => setActiveTab("html")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "html" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                HTML Template
              </button>
              <button
                onClick={() => setActiveTab("vars")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "vars" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Variables ({selectedTemplate.variables.length})
              </button>
              <button
                onClick={() => setActiveTab("test")}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "test" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Send Test Email
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === "text" && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => copyToClipboard(selectedTemplate.bodyText, "bodyText", "Plain text body")}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    {copiedKey === "bodyText" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Text Body
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {selectedTemplate.bodyText}
                </pre>
              </div>
            )}

            {activeTab === "html" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => copyToClipboard(selectedTemplate.bodyHtml, "bodyHtml", "HTML body")}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    {copiedKey === "bodyHtml" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Code2 className="w-3.5 h-3.5" />}
                    Copy HTML
                  </button>
                </div>
                
                <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 min-h-[250px]">
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedTemplate.bodyHtml }} 
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </div>
            )}

            {activeTab === "vars" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  These dynamic placeholder variables are populated automatically when generating notifications:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.variables.map(v => (
                    <div key={v} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 flex items-center justify-between">
                      <span>{`{{${v}}}`}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-sans">Var</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "test" && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed font-medium flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Send a manual test email for <strong>{selectedTemplate.name}</strong> using Resend. Real email sending is enabled only when <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-bold">RESEND_API_KEY</code> is configured on Vercel/server.
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Recipient Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 text-xs font-medium"
                    />
                  </div>

                  {selectedTemplate.variables.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Sample Variable Overrides</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedTemplate.variables.map(v => (
                          <div key={v} className="space-y-1">
                            <span className="text-[11px] font-mono text-slate-400">{`{{${v}}}`}</span>
                            <input
                              type="text"
                              value={testVars[v] || ""}
                              onChange={(e) => setTestVars({ ...testVars, [v]: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Sender: {providerStatus.fromEmail}
                    </span>
                    <button
                      onClick={handleSendTestEmail}
                      disabled={isSendingTest}
                      className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Test Email
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Provider Readiness Card */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <h4 className="font-bold text-sm">Resend Transactional Email Setup</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Resend is configured for server-side transactional dispatch via <code className="text-primary font-mono font-bold">process.env.RESEND_API_KEY</code>. Automatic triggers in real lead flows remain disabled until explicitly activated.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
