import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchAdminSession } from "@/lib/admin-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  defaultSiteSettings,
  fetchSiteSettingsAdmin,
  saveSiteSettingsAdmin,
  type SiteSettings,
} from "@/lib/site-settings";

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
  const { toast } = useToast();
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
    fetchSiteSettingsAdmin()
      .then((data) => {
        if (!active) return;
        setSettings(data);
      })
      .catch(() => {
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
      toast({ title: "Saved", description: "Site settings updated." });
    } catch (error) {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure your admin preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-gray-200 rounded-lg p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
          <TabsTrigger value="areas">Service Areas</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h3 className="font-semibold text-sm text-gray-900 mb-5">Owner Account</h3>
            <div className="py-3 border-b border-gray-200">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-widest block mb-1">Admin Email</span>
              <span className="text-gray-900 font-medium">{adminEmail}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h3 className="font-semibold text-sm text-gray-900 mb-5">Notifications</h3>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              <span className="text-gray-900">Email notifications for new leads</span>
            </label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Webhook (CRM Integration)</h3>
            <p className="text-xs text-gray-600 mb-4">
              Forward new leads to an external CRM by providing a webhook URL.
            </p>
            <input
              type="url"
              placeholder="https://your-crm.com/webhook"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-3">
              Enable Lovable Cloud for real-time webhook delivery.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="maps" className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Maps</h3>
            <p className="text-xs text-gray-600 mb-6">Update contact and map settings for the Service Areas section.</p>

            <div className="grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="contact@barrigudo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  value={settings.businessAddress}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                  placeholder="Boston, Massachusetts"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapsQuery">Map Query</Label>
                <Input
                  id="mapsQuery"
                  value={settings.mapsQuery}
                  onChange={(e) => setSettings({ ...settings, mapsQuery: e.target.value })}
                  placeholder="Extreme Pro Construction Services, Lowell MA"
                />
                <p className="text-xs text-gray-500">Used by the embedded map and Directions button.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="directionsUrl">Directions URL (optional)</Label>
                <Input
                  id="directionsUrl"
                  value={settings.directionsUrl || ""}
                  onChange={(e) => setSettings({ ...settings, directionsUrl: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-600 mb-2">Directions Preview</p>
                <a
                  href={directionsPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {directionsPreview}
                </a>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleSave(settings)}
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-200 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="areas" className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-7">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Service Areas</h3>
            <p className="text-xs text-gray-600 mb-6">Edit the 10 primary service areas shown on the homepage.</p>

            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={`area-${index}`} className="space-y-2">
                  <Label htmlFor={`area-${index}`}>Area {index + 1}</Label>
                  <Input
                    id={`area-${index}`}
                    value={settings.serviceAreas[index] || ""}
                    onChange={(e) => updateServiceArea(index, e.target.value)}
                    placeholder={`Service area ${index + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button
                onClick={() => handleSave(settings)}
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-200 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
