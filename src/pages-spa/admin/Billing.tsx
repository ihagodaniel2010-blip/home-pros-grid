import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { getCompanySettings, CompanySettings } from "@/lib/company-settings";
import { getOrganizationBalance } from "@/lib/lead-market";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  CreditCard, DollarSign, Activity, PlusCircle, Download, Copy, 
  Sparkles, ArrowUpRight, ArrowDownRight, CheckCircle2, PauseCircle, 
  AlertTriangle, Loader2, FileSpreadsheet
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LedgerItem {
  id: string;
  organization_id: string;
  amount: number;
  transaction_type: string;
  reference_type?: string;
  reference_id?: string;
  description: string;
  created_at: string;
}

export default function Billing() {
  const { user, isWorker } = useUser();
  const navigate = useNavigate();
  const currentOrganization = user?.organization;

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Manual Credit Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [isSavingCredit, setIsSavingCredit] = useState(false);

  useEffect(() => {
    if (isWorker) {
      navigate("/admin");
      return;
    }

    if (!currentOrganization?.id) return;

    let active = true;
    setIsLoading(true);

    const loadBillingData = async () => {
      try {
        const [companySet, currentBal] = await Promise.all([
          getCompanySettings(currentOrganization.id),
          getOrganizationBalance()
        ]);

        // Fetch ledger
        const { data: ledgerData, error: ledgerErr } = await supabase
          .from("organization_credit_ledger")
          .select("*")
          .eq("organization_id", currentOrganization.id)
          .order("created_at", { ascending: false });

        if (ledgerErr) {
          console.warn("Could not fetch ledger rows:", ledgerErr);
        }

        if (!active) return;
        setSettings(companySet);
        setBalance(currentBal);
        setLedger(ledgerData || []);
      } catch (err) {
        console.error("Failed to load billing data:", err);
        if (active) toast.error("Failed to load billing details.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadBillingData();

    return () => {
      active = false;
    };
  }, [currentOrganization?.id, isWorker, navigate]);

  const handleAddManualCredit = async () => {
    const amountNum = Number(manualAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid credit amount.");
      return;
    }

    if (!currentOrganization?.id) return;

    setIsSavingCredit(true);
    try {
      const newLedgerRow = {
        organization_id: currentOrganization.id,
        amount: amountNum,
        transaction_type: "manual_credit",
        reference_type: "manual_topup",
        description: manualDescription.trim() || "Manual credit added by admin",
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("organization_credit_ledger")
        .insert(newLedgerRow);

      if (error) throw error;

      toast.success(`$${amountNum.toFixed(2)} credit added successfully.`);
      setIsManualModalOpen(false);
      setManualAmount("");
      setManualDescription("");

      // Refresh balance & ledger
      const newBal = await getOrganizationBalance();
      setBalance(newBal);

      const { data: refreshedLedger } = await supabase
        .from("organization_credit_ledger")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .order("created_at", { ascending: false });
      
      setLedger(refreshedLedger || []);
    } catch (err: any) {
      console.error("Failed to add manual credit:", err);
      toast.error(err.message || "Failed to record manual credit.");
    } finally {
      setIsSavingCredit(false);
    }
  };

  const exportCSV = () => {
    if (ledger.length === 0) {
      toast.info("No ledger entries to export.");
      return;
    }

    const headers = ["Date", "Type", "Description", "Amount ($)", "Reference ID"];
    const rows = ledger.map(item => [
      new Date(item.created_at).toLocaleString(),
      item.transaction_type,
      `"${item.description.replace(/"/g, '""')}"`,
      item.amount.toFixed(2),
      item.reference_id || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing_ledger_${currentOrganization?.name || "ha_construction"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger exported to CSV.");
  };

  const copySummary = () => {
    const summary = `
H&A Construction — Billing Summary
-----------------------------------
Company: ${currentOrganization?.name || "H&A Construction"}
Current Balance: $${balance.toFixed(2)}
Monthly Budget: $${(settings?.monthly_lead_budget || 0).toFixed(2)}
Max Lead Price: $${(settings?.max_lead_price || 0).toFixed(2)}
Status: ${settings?.lead_status === 'paused' ? 'Paused' : balance <= 0 ? 'Low Balance' : 'Active'}
Total Ledger Entries: ${ledger.length}
    `.trim();

    navigator.clipboard.writeText(summary);
    toast.success("Billing summary copied to clipboard.");
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading billing & credits...</p>
      </div>
    );
  }

  const creditsAddedTotal = ledger
    .filter(i => i.amount > 0)
    .reduce((sum, i) => sum + i.amount, 0);

  const creditsUsedTotal = ledger
    .filter(i => i.amount < 0)
    .reduce((sum, i) => sum + Math.abs(i.amount), 0);

  const leadPurchasesCount = ledger
    .filter(i => i.transaction_type === "lead_debit").length;

  const isPaused = settings?.lead_status === "paused";
  const isLowBalance = balance <= 0;

  return (
    <div className="p-8 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            Billing & Credits
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Manage your lead purchasing credits, budget, and ledger history.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={copySummary}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            Copy Summary
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <PlusCircle className="h-4 w-4" />
            Add Manual Credit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Current Balance</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">${balance.toFixed(2)}</span>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {isPaused ? (
                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  <PauseCircle className="h-3 w-3" /> Receiving Paused
                </span>
              ) : isLowBalance ? (
                <span className="inline-flex items-center gap-1 text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">
                  <AlertTriangle className="h-3 w-3" /> Low Balance
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  <CheckCircle2 className="h-3 w-3" /> Active & Eligible
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Monthly Budget</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">${(settings?.monthly_lead_budget || 0).toFixed(2)}</span>
            <p className="text-xs text-slate-400 mt-2 font-medium">Max per lead: ${(settings?.max_lead_price || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Credits Added</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">${creditsAddedTotal.toFixed(2)}</span>
            <p className="text-xs text-slate-400 mt-2 font-medium">Manual top-ups & deposits</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Credits Spent</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">${creditsUsedTotal.toFixed(2)}</span>
            <p className="text-xs text-slate-400 mt-2 font-medium">{leadPurchasesCount} lead purchase transactions</p>
          </div>
        </div>
      </div>

      {/* Future Payments Readiness Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 mb-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
          <Sparkles className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Online Payments Coming Soon
          </div>
          <h3 className="text-xl font-bold mb-2">Automated Credit Top-Up & Subscriptions</h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            In the upcoming release, your company will be able to save payment methods, auto-recharge credits when balance runs low, and manage active recurring subscriptions directly from this portal.
          </p>
          <button 
            disabled 
            className="px-6 py-2.5 bg-white/10 text-white/50 border border-white/10 font-semibold text-xs rounded-xl cursor-not-allowed inline-flex items-center gap-2"
          >
            Instant Online Top-Up (Coming Soon)
          </button>
        </div>
      </div>

      {/* Ledger History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Ledger History</h3>
            <p className="text-xs text-slate-500 mt-1">Detailed record of credit deposits, lead debits, and adjustments.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
            {ledger.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="p-4 pl-6">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 pr-6 text-right">Ref ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ledger.map((item) => {
                const isPositive = item.amount > 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}>
                        {item.transaction_type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-900 max-w-md">
                      {item.description}
                    </td>
                    <td className={`p-4 text-right font-bold whitespace-nowrap ${
                      isPositive ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {isPositive ? `+$${item.amount.toFixed(2)}` : `-$${Math.abs(item.amount).toFixed(2)}`}
                    </td>
                    <td className="p-4 pr-6 text-right font-mono text-xs text-slate-400 whitespace-nowrap">
                      {item.reference_id ? `${item.reference_id.substring(0, 8)}...` : "—"}
                    </td>
                  </tr>
                );
              })}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                    No ledger transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Credit Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Add Manual Credit</h3>
            <p className="text-xs text-slate-500 mb-6">Manually credit account balance for testing or admin adjustment.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Credit Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  placeholder="100.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Reason / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit test credits, manual adjustment"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsManualModalOpen(false)}
                disabled={isSavingCredit}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualCredit}
                disabled={isSavingCredit}
                className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isSavingCredit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
