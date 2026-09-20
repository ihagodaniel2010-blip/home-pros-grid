import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchAdminSession } from "@/lib/admin-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Settings as SettingsIcon, Building2, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  defaultSiteSettings,
  fetchSiteSettingsAdmin,
  saveSiteSettingsAdmin,
  type SiteSettings,
} from "@/lib/site-settings";
import CompanySettings from "./CompanySettings";

const useAdminEmail = () => {
  const [email, setEmail] = useState<string>("Loading...");

  useEffect(() => {
    let active = true;
    fetchAdminSession()
      .then((session) => {
        if (!active) return;
        setEmail(session?.email || "Unknown");
      })
      .catch(() => {
        if (!active) return;
        setEmail("Unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  return email;
};

const AdminSettings = () => {
  const adminEmail = useAdminEmail();
  const location = useLocation();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const tabFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "maps" || tab === "general" || tab === "company") return tab;
    if (location.hash === "#company-ownership") return "company";
    return "company"; // Default to company tab so Company Profile & Business Structure is immediately visible on /admin/settings
  }, [location.search, location.hash]);

  const [activeTab, setActiveTab] = useState(tabFromQuery);

  useEffect(() => {
    setActiveTab(tabFromQuery);
  }, [tabFromQuery]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchSiteSettingsAdmin()
      .then((data) => {
        if (!active) return;
        setSettings(data);
      })
      .catch((err) => {
        console.error("Settings load error:", err);
        if (!active) return;
        setSettings(defaultSiteSettings);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const directionsPreview = useMemo(() => {
    const source = settings.mapsQuery || settings.businessAddress;
    const encoded = encodeURIComponent(source);
    if (settings.directionsUrl && settings.directionsUrl.trim().length > 0) {
      return settings.directionsUrl.trim();
    }
    return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  }, [settings.mapsQuery, settings.businessAddress, settings.directionsUrl]);

  const handleSave = async (payload: SiteSettings) => {
    setIsSaving(true);
    try {
      const saved = await saveSiteSettingsAdmin(payload);
      setSettings(saved);
      toast.success(t("settings.save_success") || "Settings saved successfully");
    } catch (error) {
      console.error("Settings save error:", error);
      toast.error(t("settings.save_error") || "Failed to save settings");
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

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-32 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            {t("settings.title") || "Admin Settings & Configuration"}
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {t("settings.desc") || "Manage company profile, partner ownership structure, Google Maps, and notifications."}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl h-14 w-full sm:w-fit border border-slate-200/60 backdrop-blur-sm grid grid-cols-3 sm:flex gap-1">
          <TabsTrigger
            value="company"
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Building2 className="w-4 h-4 text-primary" />
            <span>{t("settings.tabs_company") || "Company & Ownership"}</span>
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <SettingsIcon className="w-4 h-4 text-slate-500" />
            <span>{t("settings.tabs_general") || "General & Account"}</span>
          </TabsTrigger>
          <TabsTrigger
            value="maps"
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>{t("settings.tabs_maps") || "Maps & Location"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Company Profile & Business Structure / Partner Roster Tab */}
        <TabsContent value="company" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CompanySettings />
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("settings.owner_account") || "Owner Account"}
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">
                  {t("settings.admin_email") || "Admin Account Email"}
                </span>
                <span className="text-gray-900 font-semibold">{adminEmail}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("settings.notifications") || "Notifications"}
            </h3>
            <label className="flex items-center gap-4 group cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <input type="checkbox" defaultChecked className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20" />
              <div className="flex flex-col">
                <span className="text-slate-900 font-semibold text-sm">
                  {t("settings.notify_leads") || "Lead Notifications"}
                </span>
                <span className="text-slate-500 text-xs">Real-time alerts via email</span>
              </div>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("settings.webhook_title") || "Webhook Integration"}
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              {t("settings.webhook_desc") || "Configure automated webhook delivery for CRM and lead updates."}
            </p>
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://your-crm.com/webhook"
                className="h-12 bg-slate-50/50 rounded-xl"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                Power automation with standard JSON webhook delivery.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Maps & Location Tab */}
        <TabsContent value="maps" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-2">
              {t("settings.tabs_maps") || "Maps & Location"}
            </h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">
              {t("settings.maps_desc") || "Configure Google Maps display, business address, and navigation links."}
            </p>

            <div className="grid gap-6">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("settings.contact_email") || "Contact Email"}
                </Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("settings.business_address") || "Business Address"}
                </Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={settings.businessAddress}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  placeholder="Street, City, State"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("settings.map_query") || "Maps Search Query"}
                </Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={settings.mapsQuery}
                  onChange={(e) => setSettings({ ...settings, mapsQuery: e.target.value })}
                  placeholder="Company Name, City"
                />
                <p className="text-[10px] text-slate-400 font-medium">Affects the embedded map and navigation links.</p>
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("settings.directions_url") || "Directions URL"}
                </Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={settings.directionsUrl || ""}
                  onChange={(e) => setSettings({ ...settings, directionsUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Live Directions Preview</p>
                <a
                  href={directionsPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary font-semibold hover:underline break-all inline-flex items-center gap-2 group"
                >
                  {directionsPreview}
                </a>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => handleSave(settings)}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-60 active:scale-[0.98]"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("admin.save") || "Save"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
