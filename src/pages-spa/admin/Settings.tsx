import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchAdminSession } from "@/lib/admin-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  defaultSiteSettings,
  fetchSiteSettingsAdmin,
  saveSiteSettingsAdmin,
  type SiteSettings,
} from "@/lib/site-settings";

const useAdminEmail = () => {
  const { t } = useLanguage();
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
    const tab = params.get("tab") || "general";
    if (tab === "maps" || tab === "areas" || tab === "general") return tab;
    return "general";
  }, [location.search]);

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

  const updateServiceArea = (index: number, value: string) => {
    setSettings((prev) => {
      const next = [...prev.serviceAreas];
      while (next.length < 10) next.push("");
      next[index] = value;
      return { ...prev, serviceAreas: next.slice(0, 10) };
    });
  };

  const handleSave = async (payload: SiteSettings) => {
    setIsSaving(true);
    try {
      const saved = await saveSiteSettingsAdmin(payload);
      setSettings(saved);
      toast.success(t("settings.save_success"));
    } catch (error) {
      console.error("Settings save error:", error);
      toast.error(t("settings.save_error"));
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
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            {t("settings.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">{t("settings.desc")}</p>
        </div>
        <button
          onClick={() => handleSave(settings)}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-60 active:scale-[0.98]"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("admin.save")}
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl h-12 w-fit border border-slate-200/40 backdrop-blur-sm">
          <TabsTrigger value="general" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">{t("settings.tabs_general")}</TabsTrigger>
          <TabsTrigger value="maps" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">{t("settings.tabs_maps")}</TabsTrigger>
          <TabsTrigger value="areas" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">{t("settings.tabs_areas")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("settings.owner_account")}
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">{t("settings.admin_email")}</span>
                <span className="text-gray-900 font-semibold">{adminEmail}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("settings.notifications")}
            </h3>
            <label className="flex items-center gap-4 group cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <input type="checkbox" defaultChecked className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20" />
              <div className="flex flex-col">
                <span className="text-slate-900 font-semibold text-sm">{t("settings.notify_leads")}</span>
                <span className="text-slate-500 text-xs">Real-time alerts via email</span>
              </div>
            </label>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("settings.webhook_title")}
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              {t("settings.webhook_desc")}
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

        <TabsContent value="maps" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-2">{t("settings.tabs_maps")}</h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">{t("settings.maps_desc")}</p>

            <div className="grid gap-6">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("settings.contact_email")}</Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("settings.business_address")}</Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={settings.businessAddress}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  placeholder="Street, City, State"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("settings.map_query")}</Label>
                <Input
                  className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={settings.mapsQuery}
                  onChange={(e) => setSettings({ ...settings, mapsQuery: e.target.value })}
                  placeholder="Company Name, City"
                />
                <p className="text-[10px] text-slate-400 font-medium">Affects the embedded map and navigation links.</p>
              </div>

              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("settings.directions_url")}</Label>
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
          </div>
        </TabsContent>

        <TabsContent value="areas" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
            <h3 className="font-bold text-base text-gray-900 mb-2">{t("settings.areas_title")}</h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">{t("settings.areas_desc")}</p>

            <div className="grid md:grid-cols-2 gap-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={`area-${index}`} className="group space-y-2.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-primary transition-colors">
                    Area {index + 1}
                  </Label>
                  <Input
                    className="h-12 rounded-xl focus:ring-2 focus:ring-primary/10 border-slate-200"
                    id={`area-${index}`}
                    value={settings.serviceAreas[index] || ""}
                    onChange={(e) => updateServiceArea(index, e.target.value)}
                    placeholder={`Service area ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 flex justify-end">
        <button
          onClick={() => handleSave(settings)}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-2xl shadow-primary/30 disabled:opacity-60 active:scale-[0.98] h-14"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {t("admin.save")}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
