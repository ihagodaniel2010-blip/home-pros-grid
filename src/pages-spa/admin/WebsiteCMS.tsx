import { useState, useEffect } from "react";
import { Globe, Layout, Store, Images, Share2, Search, Save, Plus, Trash2, Eye, EyeOff, Edit, CheckCircle2, Loader2, Sparkles, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { fetchWebsiteSettings, saveWebsiteSettings, fetchWebsiteCategories, upsertWebsiteCategory, deleteWebsiteCategory, WebsiteSettings, WebsiteCategory, DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-cms";
import { getPublicPortfolioMedia } from "@/lib/job-media";

type CMSTab = "homepage" | "categories" | "portfolio" | "social" | "seo";

export default function WebsiteCMS() {
  const { user } = useUser();
  const orgId = user?.organization?.id || DEFAULT_ORG_ID;

  const [activeTab, setActiveTab] = useState<CMSTab>("homepage");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [newAreaInput, setNewAreaInput] = useState("");

  // Categories State
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<WebsiteCategory> | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Published Portfolio Media State
  const [portfolioMedia, setPortfolioMedia] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadCMS = async () => {
      setIsLoading(true);
      try {
        const [settData, catData, mediaData] = await Promise.all([
          fetchWebsiteSettings(orgId),
          fetchWebsiteCategories(orgId),
          getPublicPortfolioMedia().catch(() => [])
        ]);

        if (isMounted) {
          setSettings(settData);
          setCategories(catData);
          setPortfolioMedia(mediaData || []);
        }
      } catch (err) {
        console.error("Error loading CMS data:", err);
        toast.error("Failed to load CMS settings.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCMS();
    return () => { isMounted = false; };
  }, [orgId]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updated = await saveWebsiteSettings({
        ...settings,
        organization_id: orgId
      });
      setSettings(updated);
      toast.success("Website settings updated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory?.name?.trim()) {
      toast.error("Category name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await upsertWebsiteCategory({
        ...editingCategory,
        organization_id: orgId,
        name: editingCategory.name.trim()
      });

      setCategories(prev => {
        const idx = prev.findIndex(c => c.id === saved.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = saved;
          return clone;
        }
        return [...prev, saved];
      });

      toast.success("Category saved!");
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      toast.error("Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteWebsiteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success("Category deleted.");
    } catch (err) {
      toast.error("Failed to delete category.");
    }
  };

  const handleAddArea = () => {
    if (!newAreaInput.trim()) return;
    if (settings.service_areas.includes(newAreaInput.trim())) return;
    setSettings(prev => ({
      ...prev,
      service_areas: [...prev.service_areas, newAreaInput.trim()]
    }));
    setNewAreaInput("");
  };

  const handleRemoveArea = (area: string) => {
    setSettings(prev => ({
      ...prev,
      service_areas: prev.service_areas.filter(a => a !== area)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0b2a4a]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5 text-blue-600" /> Website Management &amp; Content CMS
          </div>
          <h1 className="text-2xl font-black text-[#0b2a4a]">H&amp;A Website Content Manager</h1>
          <p className="text-xs text-slate-500">Manage hero images, services, categories, social links, and SEO without writing code.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <a
            href="https://www.h-a-construction.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Globe className="w-4 h-4 text-blue-600" /> View Live Website &rarr;
          </a>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs px-5 h-10 shadow-md"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save All CMS Changes
          </Button>
        </div>
      </div>

      {/* Tabs Submenu */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl border border-slate-300/60 overflow-x-auto text-xs font-bold text-slate-600">
        {[
          { id: "homepage", label: "Homepage Editor", icon: Layout },
          { id: "categories", label: "Services & Categories", icon: Store },
          { id: "portfolio", label: "Public Portfolio Media", icon: Images },
          { id: "social", label: "Social Media & Contact", icon: Share2 },
          { id: "seo", label: "SEO & Service Areas", icon: Search },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CMSTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              activeTab === tab.id ? "bg-white text-[#0b2a4a] shadow-xs" : "hover:text-slate-900"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HOMEPAGE EDITOR */}
      {activeTab === "homepage" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-[#0b2a4a]">Homepage Hero Section Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Main Hero Headline</label>
                <Input
                  value={settings.hero_headline}
                  onChange={e => setSettings({ ...settings, hero_headline: e.target.value })}
                  placeholder="Build a Better Home for What's Next."
                  className="font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hero Subheadline / Description</label>
                <Textarea
                  value={settings.hero_subheadline}
                  onChange={e => setSettings({ ...settings, hero_subheadline: e.target.value })}
                  rows={4}
                  placeholder="Remodeling, additions, and custom construction that add beauty, function, and value..."
                  className="text-xs font-medium"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hero Background Image URL</label>
                <Input
                  value={settings.hero_image_url || ""}
                  onChange={e => setSettings({ ...settings, hero_image_url: e.target.value })}
                  placeholder="https://..."
                  className="text-xs font-mono"
                />
              </div>

              {settings.hero_image_url && (
                <div className="aspect-video relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <img src={settings.hero_image_url} alt="Hero Preview" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Hero Preview
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICES & CATEGORIES */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0b2a4a]">Service Categories</h2>
              <p className="text-xs text-slate-500">Categories drive public service pages and portfolio filters.</p>
            </div>
            <Button
              onClick={() => {
                setEditingCategory({
                  name: "",
                  slug: "",
                  description: "",
                  cover_image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                  display_order: categories.length + 1,
                  is_published: true,
                  show_on_homepage: true
                });
                setIsCategoryModalOpen(true);
              }}
              className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> + Create Category
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="aspect-video relative overflow-hidden bg-slate-900">
                    {cat.cover_image_url ? (
                      <img src={cat.cover_image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">No Image</div>
                    )}
                    <Badge className={`absolute top-2 left-2 text-[9px] ${cat.is_published ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'}`}>
                      {cat.is_published ? 'Published' : 'Hidden'}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                    <p className="text-[10px] text-blue-700 font-mono mt-0.5">/services/{cat.slug}</p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{cat.description || "No description set."}</p>
                  </div>
                </div>

                <div className="p-3 pt-0 border-t border-slate-200/60 flex items-center justify-between text-xs mt-2">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setIsCategoryModalOpen(true);
                    }}
                    className="text-blue-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCat(cat.id)}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PUBLIC PORTFOLIO MEDIA */}
      {activeTab === "portfolio" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0b2a4a]">Publicly Published Portfolio Photos</h2>
            <p className="text-xs text-slate-500">Only photos marked with Public Visibility appear on the home page and category galleries.</p>
          </div>

          {portfolioMedia.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No photos currently approved for the public website.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {portfolioMedia.map(m => (
                <div key={m.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-900 aspect-square relative">
                  <img src={m.signedUrl} alt={m.caption || "Portfolio photo"} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[9px] text-white truncate">
                    {m.caption || m.file_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SOCIAL MEDIA & CONTACT */}
      {activeTab === "social" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-[#0b2a4a]">Social Media URLs &amp; Company Contact</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Social Links (Header &amp; Footer)</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Facebook URL</label>
                <div className="flex gap-2">
                  <Input value={settings.facebook_url} onChange={e => setSettings({ ...settings, facebook_url: e.target.value })} className="text-xs" />
                  <Button
                    size="sm"
                    variant={settings.facebook_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, facebook_enabled: !settings.facebook_enabled })}
                    className="text-xs font-bold h-9"
                  >
                    {settings.facebook_enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Instagram URL</label>
                <div className="flex gap-2">
                  <Input value={settings.instagram_url} onChange={e => setSettings({ ...settings, instagram_url: e.target.value })} className="text-xs" />
                  <Button
                    size="sm"
                    variant={settings.instagram_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, instagram_enabled: !settings.instagram_enabled })}
                    className="text-xs font-bold h-9"
                  >
                    {settings.instagram_enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">TikTok URL</label>
                <div className="flex gap-2">
                  <Input value={settings.tiktok_url} onChange={e => setSettings({ ...settings, tiktok_url: e.target.value })} className="text-xs" />
                  <Button
                    size="sm"
                    variant={settings.tiktok_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, tiktok_enabled: !settings.tiktok_enabled })}
                    className="text-xs font-bold h-9"
                  >
                    {settings.tiktok_enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">YouTube URL</label>
                <div className="flex gap-2">
                  <Input value={settings.youtube_url} onChange={e => setSettings({ ...settings, youtube_url: e.target.value })} className="text-xs" />
                  <Button
                    size="sm"
                    variant={settings.youtube_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, youtube_enabled: !settings.youtube_enabled })}
                    className="text-xs font-bold h-9"
                  >
                    {settings.youtube_enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Information</h3>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                <Input value={settings.company_phone} onChange={e => setSettings({ ...settings, company_phone: e.target.value })} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Public Email</label>
                <Input value={settings.company_email} onChange={e => setSettings({ ...settings, company_email: e.target.value })} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Public Address / Region</label>
                <Input value={settings.company_address} onChange={e => setSettings({ ...settings, company_address: e.target.value })} className="text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SEO & SERVICE AREAS */}
      {activeTab === "seo" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-[#0b2a4a]">SEO Metadata &amp; Service Areas</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Global SEO Title</label>
              <Input value={settings.seo_title} onChange={e => setSettings({ ...settings, seo_title: e.target.value })} className="text-xs" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Global Meta Description</label>
              <Textarea value={settings.seo_description} onChange={e => setSettings({ ...settings, seo_description: e.target.value })} rows={3} className="text-xs" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Service Area Towns</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newAreaInput}
                  onChange={e => setNewAreaInput(e.target.value)}
                  placeholder="Add town (e.g. Kennebunk)"
                  className="text-xs"
                />
                <Button onClick={handleAddArea} className="bg-slate-900 text-white font-bold text-xs h-9">
                  Add Town
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {settings.service_areas.map(town => (
                  <Badge key={town} className="bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                    📍 {town}
                    <button onClick={() => handleRemoveArea(town)} className="text-slate-400 hover:text-red-600 font-bold ml-1">✕</button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Category Edit */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-[#0b2a4a]">
              {editingCategory.id ? 'Edit Category' : 'Create New Category'}
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category Name</label>
              <Input
                value={editingCategory.name || ""}
                onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                placeholder="e.g. Drywall"
                className="text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">URL Slug</label>
              <Input
                value={editingCategory.slug || ""}
                onChange={e => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                placeholder="drywall"
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Cover Image URL</label>
              <Input
                value={editingCategory.cover_image_url || ""}
                onChange={e => setEditingCategory({ ...editingCategory, cover_image_url: e.target.value })}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
              <Textarea
                value={editingCategory.description || ""}
                onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCategory.is_published ?? true}
                  onChange={e => setEditingCategory({ ...editingCategory, is_published: e.target.checked })}
                />
                Published
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)} className="text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} disabled={isSaving} className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs">
                Save Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
