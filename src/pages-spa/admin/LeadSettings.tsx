import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import { getCompanySettings, saveCompanySettings, CompanySettings } from "@/lib/company-settings";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Save, Activity, PauseCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LeadSettings = () => {
  const { t } = useLanguage();
  const { user } = useUser();
  const currentOrganization = user?.organization;
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonthSpent, setCurrentMonthSpent] = useState<number>(0);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    
    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const data = await getCompanySettings(currentOrganization.id);
        if (!active) return;
        setSettings(data);

        // Fetch current month spent from organization_credit_ledger
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: ledgerData, error: ledgerError } = await supabase
          .from("organization_credit_ledger")
          .select("amount")
          .eq("organization_id", currentOrganization.id)
          .eq("transaction_type", "lead_debit")
          .gte("created_at", startOfMonth);

        if (ledgerError) throw ledgerError;

        const spent = ledgerData.reduce((acc, row) => acc + Math.abs(Number(row.amount)), 0);
        setCurrentMonthSpent(spent);
      } catch (err) {
        console.error("Failed to load lead settings:", err);
        if (active) toast.error("Failed to load settings.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [currentOrganization?.id]);

  const handleSave = async () => {
    if (!settings || !currentOrganization?.id) return;

    if (settings.paused_until) {
      const selectedDate = new Date(settings.paused_until);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 20);
      if (selectedDate > maxDate) {
        toast.error("Max pause duration is 20 days.");
        return;
      }
    }

    setIsSaving(true);
    try {
      await saveCompanySettings(settings);
      toast.success("Lead settings saved successfully.");
    } catch (err) {
      console.error("Error saving lead settings:", err);
      toast.error("Failed to save lead settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading settings...</p>
      </div>
    );
  }

  if (!settings) {
    return <div className="p-8">No settings found.</div>;
  }

  const maxDateForPause = new Date();
  maxDateForPause.setDate(maxDateForPause.getDate() + 20);
  const maxDateStr = maxDateForPause.toISOString().split('T')[0];

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            Lead Settings
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Manage how and when you receive leads.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-60 active:scale-[0.98]"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("admin.save")}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
          <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
            Status
          </h3>
          
          <div className="grid gap-6">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Receiving Status</Label>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings({ ...settings, lead_status: "active", paused_until: null })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    settings.lead_status === 'active' ? 'border-green-500 bg-green-50 text-green-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  Active
                </button>
                <button
                  onClick={() => setSettings({ ...settings, lead_status: "paused" })}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    settings.lead_status === 'paused' ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <PauseCircle className="h-5 w-5" />
                  Paused
                </button>
              </div>
            </div>

            {settings.lead_status === "paused" && (
              <div className="space-y-2.5 animate-in fade-in zoom-in duration-300">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Paused Until (Max 20 Days)</Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10 max-w-sm"
                  type="date"
                  max={maxDateStr}
                  min={new Date().toISOString().split('T')[0]}
                  value={settings.paused_until ? settings.paused_until.split('T')[0] : ""}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (date > maxDateForPause) {
                      toast.error("Max pause duration is 20 days.");
                      return;
                    }
                    setSettings({ ...settings, paused_until: date.toISOString() });
                  }}
                />
              </div>
            )}
            
            <label className="flex items-center gap-4 group cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={settings.auto_receive_leads !== false}
                onChange={(e) => setSettings({ ...settings, auto_receive_leads: e.target.checked })}
                className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20"
              />
              <div className="flex flex-col">
                <span className="text-slate-900 font-bold text-sm">Auto Receive Leads</span>
                <span className="text-slate-500 text-xs">Automatically buy leads that match your tasks and zip codes</span>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
          <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
            Budget
          </h3>
          <div className="grid gap-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">Current Month Spent</span>
                <span className="text-gray-900 font-semibold text-lg">${currentMonthSpent.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">Monthly Budget</span>
                <span className="text-primary font-bold text-lg">${Number(settings.monthly_lead_budget || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Lead Budget ($)</Label>
              <Input
                className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10 max-w-sm"
                type="number"
                min="0"
                step="10"
                value={settings.monthly_lead_budget || 0}
                onChange={(e) => setSettings({ ...settings, monthly_lead_budget: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Max Price Per Lead ($)</Label>
              <Input
                className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10 max-w-sm"
                type="number"
                min="0"
                step="5"
                value={settings.max_lead_price || 0}
                onChange={(e) => setSettings({ ...settings, max_lead_price: Number(e.target.value) })}
              />
              <p className="text-[10px] text-slate-400 font-medium">You will not receive leads that cost more than this amount.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadSettings;
