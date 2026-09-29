import { useState, useEffect, useRef } from "react";
import { 
  Globe, Layout, Store, Images, Share2, Search, Save, Plus, Trash2, Eye, EyeOff, Edit, 
  CheckCircle2, Loader2, Sparkles, MapPin, Phone, Mail, Upload, FolderPlus, Star, Archive, 
  AlertTriangle, RefreshCw, Layers, Check, ExternalLink, Image as ImageIcon, X, UploadCloud, Film
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { 
  fetchWebsiteSettings, saveWebsiteSettings, fetchWebsiteCategories, 
  upsertWebsiteCategory, deleteWebsiteCategory, archiveWebsiteCategory,
  fetchMediaCategoryIds, saveMediaCategoryIds, fetchProjectCategoryIds, saveProjectCategoryIds,
  WebsiteSettings, WebsiteCategory, DEFAULT_WEBSITE_SETTINGS 
} from "@/lib/website-cms";
import { 
  uploadJobMediaRecord, updateJobMediaVisibility, 
  deleteJobMediaRecord, resolveSignedMediaUrl
} from "@/lib/job-media";
import { getServiceJobs } from "@/lib/service-jobs";
import { supabase } from "@/lib/supabase";

type CMSTab = "homepage" | "media" | "categories" | "projects" | "social" | "seo";

type MediaPickerTarget = 
  | { type: "hero_desktop" }
  | { type: "hero_mobile" }
  | { type: "category_cover" }
  | { type: "project_cover"; jobId: string }
  | null;

export default function WebsiteCMS() {
  const { user } = useUser();
  const orgId = user?.organization?.id || DEFAULT_ORG_ID;

  const [activeTab, setActiveTab] = useState<CMSTab>("homepage");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [newAreaInput, setNewAreaInput] = useState("");

  // Categories State
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<WebsiteCategory> | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [showArchivedCategories, setShowArchivedCategories] = useState(false);

  // Service Jobs / Projects State
  const [serviceJobs, setServiceJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // All Media Records State
  const [allMedia, setAllMedia] = useState<any[]>([]);
  const [mediaCategoriesMap, setMediaCategoriesMap] = useState<Record<string, string[]>>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Drag & Drop State
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Media Library Selector Modal State
  const [pickerTarget, setPickerTarget] = useState<MediaPickerTarget>(null);

  // Load all data
  const loadCMS = async () => {
    setIsLoading(true);
    setIsTableMissing(false);
    try {
      const [settData, catData, jobsData] = await Promise.all([
        fetchWebsiteSettings(orgId),
        fetchWebsiteCategories(orgId, showArchivedCategories),
        getServiceJobs(orgId).catch(() => [])
      ]);

      setSettings(settData);
      setCategories(catData);
      setServiceJobs(jobsData || []);

      // Check if table missing was thrown
      const { error: settingsCheckError } = await supabase.from('website_settings').select('id').limit(1);
      if (settingsCheckError && (settingsCheckError.code === '42P01' || settingsCheckError.message.includes('schema cache'))) {
        setIsTableMissing(true);
      }

      // Fetch all job media records for central library
      if (supabase) {
        const { data: mediaRecords, error: mErr } = await supabase
          .from('service_job_media')
          .select('*, service_jobs(title)')
          .order('created_at', { ascending: false });

        if (!mErr && mediaRecords) {
          const resolved = await Promise.all(
            mediaRecords.map(async (m) => {
              const url = m.storage_path ? await resolveSignedMediaUrl(m.storage_path) : null;
              return { ...m, signedUrl: url };
            })
          );
          setAllMedia(resolved);

          // Fetch media category relations
          const catMap: Record<string, string[]> = {};
          for (const m of mediaRecords) {
            const catIds = await fetchMediaCategoryIds(m.id);
            catMap[m.id] = catIds;
          }
          setMediaCategoriesMap(catMap);
        }
      }
    } catch (err: any) {
      console.error("Error loading CMS data:", err);
      if (err?.message?.includes('42P01') || err?.message?.includes('schema cache') || err?.message?.includes('não encontrada')) {
        setIsTableMissing(true);
      }
      toast.error("Failed to load CMS settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCMS();
  }, [orgId, showArchivedCategories]);

  // Save Website Settings
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
      if (err?.message?.includes('42P01') || err?.message?.includes('migração 027')) {
        setIsTableMissing(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Direct File Upload (Single or Multiple)
  const handleDirectFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (!selectedJobId && serviceJobs.length > 0) {
      // Auto-assign to first available job if none selected
      setSelectedJobId(serviceJobs[0].id);
    }

    const targetJobId = selectedJobId || (serviceJobs[0]?.id || 'general-portfolio');
    setIsUploadingMedia(true);
    const totalFiles = files.length;
    let uploadedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading photo ${i + 1} of ${totalFiles}: ${file.name}...`);

        const fileExt = file.name.split('.').pop();
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const storagePath = `${orgId}/jobs/${targetJobId}/${mediaType}s/${fileName}`;

        // Multi-bucket upload fallback with explicit content type
        let uploadErr: any = null;
        const bucketsToTry = ['images', 'documents', 'receipts'];
        const contentType = file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

        for (const bucket of bucketsToTry) {
          const { error } = await supabase.storage
            .from(bucket)
            .upload(storagePath, file, { cacheControl: '3600', upsert: true, contentType });

          if (!error) {
            uploadErr = null;
            break;
          }
          uploadErr = error;
        }

        if (uploadErr) {
          console.error(`Upload error for ${file.name}:`, uploadErr);
          toast.error(`Error uploading ${file.name}: ${uploadErr?.message || "Storage error"}`);
          continue;
        }

        // Insert database record
        await uploadJobMediaRecord({
          organization_id: orgId,
          service_job_id: targetJobId,
          media_type: mediaType,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type || contentType,
          file_size_bytes: file.size,
          caption: file.name.replace(/\.[^/.]+$/, ""),
          visible_to_client: false,
          visible_on_public_site: false,
          portfolio_approved: false
        });

        uploadedCount++;
      }

      toast.success(`Successfully uploaded ${uploadedCount} photo(s)!`);
      loadCMS();
    } catch (err: any) {
      toast.error("Upload error: " + (err.message || "Failed to upload files."));
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress("");
    }
  };

  // Upload Single Image for Hero or Category Cover
  const handleUploadSingleForTarget = async (file: File, target: MediaPickerTarget) => {
    if (!file || !target) return;
    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cms_${target.type}_${Date.now()}.${fileExt}`;
      const storagePath = `${orgId}/cms/${fileName}`;
      const contentType = file.type || 'image/jpeg';

      let uploadErr: any = null;
      const bucketsToTry = ['images', 'documents', 'receipts'];
      for (const bucket of bucketsToTry) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, { cacheControl: '3600', upsert: true, contentType });

        if (!error) {
          uploadErr = null;
          break;
        }
        uploadErr = error;
      }

      if (uploadErr) throw uploadErr;

      const publicUrl = await resolveSignedMediaUrl(storagePath);
      if (!publicUrl) throw new Error("Could not resolve signed URL for uploaded image.");

      if (target.type === "hero_desktop") {
        setSettings(prev => ({ ...prev, hero_image_url: publicUrl }));
        toast.success("Desktop Hero Image uploaded & updated!");
      } else if (target.type === "hero_mobile") {
        setSettings(prev => ({ ...prev, hero_mobile_image_url: publicUrl }));
        toast.success("Mobile Hero Image uploaded & updated!");
      } else if (target.type === "category_cover" && editingCategory) {
        setEditingCategory(prev => ({ ...prev, cover_image_url: publicUrl }));
        toast.success("Category Cover Image uploaded!");
      }
    } catch (err: any) {
      toast.error("Failed to upload image: " + (err.message || ""));
    } finally {
      setIsSaving(false);
    }
  };

  // Category Operations
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
        const idx = prev.findIndex(c => c.id === saved.id || c.slug === saved.slug);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = saved;
          return clone;
        }
        return [...prev, saved];
      });

      toast.success(`Category '${saved.name}' saved!`);
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveCat = async (id: string, currentArchived: boolean) => {
    try {
      await archiveWebsiteCategory(id, !currentArchived);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, is_archived: !currentArchived } : c));
      toast.success(currentArchived ? "Category unarchived." : "Category archived.");
    } catch (err) {
      toast.error("Failed to update archive status.");
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Associated photos will remain safely in your media library.")) return;
    try {
      await deleteWebsiteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success("Category deleted.");
    } catch (err) {
      toast.error("Failed to delete category.");
    }
  };

  // Toggle Media Field
  const handleToggleMediaField = async (mediaId: string, updates: any) => {
    try {
      await updateJobMediaVisibility(mediaId, updates);

      if (typeof updates.is_featured_homepage === 'boolean' || typeof updates.title === 'string' || typeof updates.alt_text === 'string') {
        await supabase
          .from('service_job_media')
          .update(updates)
          .eq('id', mediaId);
      }

      setAllMedia(prev => prev.map(m => m.id === mediaId ? { ...m, ...updates } : m));
      toast.success("Photo status updated!");
    } catch (err) {
      toast.error("Failed to update photo status.");
    }
  };

  // Toggle Media Category Assignment
  const handleToggleMediaCategory = async (mediaId: string, categoryId: string) => {
    const currentCats = mediaCategoriesMap[mediaId] || [];
    let updatedCats: string[];
    if (currentCats.includes(categoryId)) {
      updatedCats = currentCats.filter(id => id !== categoryId);
    } else {
      updatedCats = [...currentCats, categoryId];
    }

    setMediaCategoriesMap(prev => ({ ...prev, [mediaId]: updatedCats }));
    await saveMediaCategoryIds(mediaId, updatedCats);
    toast.success("Photo category assignments updated!");
  };

  // Delete Media
  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    try {
      await deleteJobMediaRecord(mediaId);
      setAllMedia(prev => prev.filter(m => m.id !== mediaId));
      toast.success("Media deleted.");
    } catch (err) {
      toast.error("Failed to delete media.");
    }
  };

  // Service Areas
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
      {/* Missing Migration Banner Alert */}
      {isTableMissing && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Action Required: Database Migration Pending</h3>
              <p className="text-xs text-amber-800 mt-1">
                The database table <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">public.website_settings</code> or <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">public.website_categories</code> has not been executed in Supabase yet. Please run <span className="font-bold font-mono">027_website_cms_and_categories.sql</span> in the Supabase SQL Editor.
              </p>
            </div>
          </div>
          <Button onClick={loadCMS} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Check
          </Button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5 text-blue-600" /> Website Management &amp; Visual CMS
          </div>
          <h1 className="text-2xl font-black text-[#0b2a4a]">H&amp;A Institutional Content Manager</h1>
          <p className="text-xs text-slate-500">Manage hero images, categories, service photos, public media, and SEO visually without typing image URLs.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <a
            href="https://www.h-a-construction.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Globe className="w-4 h-4 text-blue-600" /> View Live Site &rarr;
          </a>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs px-5 h-10 shadow-md"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save &amp; Publish All Changes
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl border border-slate-300/60 overflow-x-auto text-xs font-bold text-slate-600">
        {[
          { id: "homepage", label: "Homepage Editor", icon: Layout },
          { id: "media", label: "Media Library & Upload", icon: Images },
          { id: "categories", label: "Services & Categories", icon: Store },
          { id: "projects", label: "Projects & Portfolio", icon: Layers },
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

      {/* TAB 1: HOMEPAGE EDITOR (VISUAL MEDIA SELECTION) */}
      {activeTab === "homepage" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0b2a4a]">Homepage Banner &amp; Hero Settings</h2>
              <p className="text-xs text-slate-500">Edit headline, subheadline, and choose hero background photos directly from your media library or device.</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
              Visual Editor
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
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
                  placeholder="Remodeling, additions, and custom construction..."
                  className="text-xs font-medium"
                />
              </div>

              {/* Desktop Hero Image Visual Picker */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0b2a4a] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" /> Desktop Hero Image
                  </label>
                  {settings.hero_image_url && (
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, hero_image_url: null }))}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                  {settings.hero_image_url ? (
                    <img src={settings.hero_image_url} alt="Desktop Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-400">No desktop hero photo selected</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <label className="px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleUploadSingleForTarget(e.target.files[0], { type: "hero_desktop" })}
                    />
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPickerTarget({ type: "hero_desktop" })}
                    className="text-xs font-bold border-slate-300 text-slate-800 h-9"
                  >
                    <Images className="w-3.5 h-3.5 mr-1 text-blue-600" /> Choose from Media Library
                  </Button>
                </div>
              </div>

              {/* Mobile Hero Image Visual Picker */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0b2a4a] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" /> Mobile Hero Image (Optional)
                  </label>
                  {settings.hero_mobile_image_url && (
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, hero_mobile_image_url: null }))}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                  {settings.hero_mobile_image_url ? (
                    <img src={settings.hero_mobile_image_url} alt="Mobile Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-xs font-bold text-slate-400">Uses desktop image by default</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <label className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Upload Mobile Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleUploadSingleForTarget(e.target.files[0], { type: "hero_mobile" })}
                    />
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPickerTarget({ type: "hero_mobile" })}
                    className="text-xs font-bold border-slate-300 text-slate-800 h-9"
                  >
                    <Images className="w-3.5 h-3.5 mr-1 text-blue-600" /> Select from Library
                  </Button>
                </div>
              </div>
            </div>

            {/* Visual Live Hero Card Preview */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Live Homepage Card Preview</label>
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-white min-h-[380px] p-8 flex flex-col justify-end shadow-xl">
                {settings.hero_image_url ? (
                  <img src={settings.hero_image_url} alt="Hero Background" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-bold bg-slate-900">
                    No image active — clean placeholder active
                  </div>
                )}
                <div className="relative z-10 space-y-3">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    SOUTHERN MAINE PREMIER CONTRACTOR
                  </Badge>
                  <h3 className="text-2xl font-black leading-tight max-w-md">
                    {settings.hero_headline}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    {settings.hero_subheadline}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEDIA LIBRARY & DIRECT DRAG-AND-DROP UPLOAD */}
      {activeTab === "media" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0b2a4a]">Central Media Library &amp; Direct Photo Upload</h2>
              <p className="text-xs text-slate-500">Upload photos directly from your computer or phone. Categorize and publish them automatically.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:outline-hidden"
              >
                <option value="">-- Associate with Project --</option>
                {serviceJobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title || `Job #${job.id.slice(0,8)}`}</option>
                ))}
              </select>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Photos / Videos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={e => e.target.files && handleDirectFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Interactive Drag and Drop Upload Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files) handleDirectFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragOver ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2" />
            <h3 className="font-bold text-slate-900 text-sm">Drag &amp; drop photos here, or click to browse files</h3>
            <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP, and MP4 directly from your computer or mobile device.</p>
          </div>

          {isUploadingMedia && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-bold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {allMedia.length === 0 ? (
            <div className="text-center py-12 border border-slate-200 rounded-2xl bg-slate-50/50">
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No photos in media library yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">Use the drag &amp; drop box above to upload project photos from your device.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allMedia.map(m => {
                const currentCats = mediaCategoriesMap[m.id] || [];
                return (
                  <div key={m.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="aspect-video relative overflow-hidden bg-slate-950">
                        {m.signedUrl ? (
                          <img src={m.signedUrl} alt={m.caption || "Media"} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Loading media...</div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-1">
                          <Badge className={`text-[9px] font-bold ${m.visible_on_public_site && m.portfolio_approved ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'}`}>
                            {m.visible_on_public_site && m.portfolio_approved ? 'Public Site' : 'Private'}
                          </Badge>
                          {m.is_featured_homepage && (
                            <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">Homepage Featured</Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        <Input
                          value={m.caption || ""}
                          onChange={e => {
                            const val = e.target.value;
                            setAllMedia(prev => prev.map(x => x.id === m.id ? { ...x, caption: val } : x));
                          }}
                          onBlur={e => handleToggleMediaField(m.id, { caption: e.target.value })}
                          placeholder="Photo Caption / Title"
                          className="text-xs font-bold h-8"
                        />

                        {/* Multi-Category Checkboxes */}
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Assigned Categories</label>
                          <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-1.5 bg-white space-y-1 text-[11px]">
                            {categories.map(cat => (
                              <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-0.5 rounded">
                                <input
                                  type="checkbox"
                                  checked={currentCats.includes(cat.id)}
                                  onChange={() => handleToggleMediaCategory(m.id, cat.id)}
                                />
                                <span className="font-semibold text-slate-800">{cat.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Action Toggles */}
                        <div className="space-y-1 pt-1 border-t border-slate-200/60 text-[11px] font-bold text-slate-700">
                          <label className="flex items-center justify-between cursor-pointer py-1">
                            <span>Publish on Public Site</span>
                            <input
                              type="checkbox"
                              checked={m.visible_on_public_site && m.portfolio_approved}
                              onChange={e => handleToggleMediaField(m.id, {
                                visible_on_public_site: e.target.checked,
                                portfolio_approved: e.target.checked
                              })}
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer py-1">
                            <span>Featured on Homepage</span>
                            <input
                              type="checkbox"
                              checked={!!m.is_featured_homepage}
                              onChange={e => handleToggleMediaField(m.id, { is_featured_homepage: e.target.checked })}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 pt-0 border-t border-slate-200/60 flex items-center justify-between mt-2">
                      <button
                        onClick={() => {
                          if (m.signedUrl) setSettings(prev => ({ ...prev, hero_image_url: m.signedUrl }));
                          toast.success("Set as Desktop Hero Image!");
                        }}
                        className="text-blue-700 font-bold text-[10px] hover:underline"
                      >
                        Use as Hero
                      </button>

                      <button
                        onClick={() => handleDeleteMedia(m.id)}
                        className="text-red-600 font-bold text-[10px] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERVICES & CATEGORIES (VISUAL COVER SELECTION) */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0b2a4a]">Service Category Manager</h2>
              <p className="text-xs text-slate-500">14 core service categories pre-configured. Manage category descriptions and cover photos visually.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchivedCategories}
                  onChange={e => setShowArchivedCategories(e.target.checked)}
                />
                Show Archived
              </label>

              <Button
                onClick={() => {
                  setEditingCategory({
                    name: "",
                    slug: "",
                    description: "",
                    cover_image_url: null,
                    display_order: categories.length + 1,
                    is_published: false,
                    show_on_homepage: true,
                    show_in_services_menu: true,
                    show_in_projects_gallery: true,
                    has_individual_page: true,
                    is_archived: false
                  });
                  setIsCategoryModalOpen(true);
                }}
                className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> + Create Category
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className={`border rounded-2xl overflow-hidden bg-slate-50/50 flex flex-col justify-between transition-all ${
                cat.is_archived ? 'border-amber-300 opacity-60' : 'border-slate-200'
              }`}>
                <div>
                  <div className="aspect-video relative overflow-hidden bg-slate-900 flex items-center justify-center">
                    {cat.cover_image_url ? (
                      <img src={cat.cover_image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-3">
                        <ImageIcon className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <span className="text-slate-400 text-[10px] font-bold block">No Cover Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge className={`text-[9px] ${cat.is_published ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'}`}>
                        {cat.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {cat.is_archived && <Badge className="bg-amber-600 text-white text-[9px]">Archived</Badge>}
                    </div>
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
                    onClick={() => handleArchiveCat(cat.id, !!cat.is_archived)}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    {cat.is_archived ? 'Unarchive' : 'Archive'}
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

      {/* TAB 4: PROJECTS & PORTFOLIO */}
      {activeTab === "projects" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0b2a4a]">Projects &amp; Public Portfolio</h2>
            <p className="text-xs text-slate-500">Select completed projects and manage their photo galleries.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {serviceJobs.map(job => (
              <div key={job.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{job.title || `Job #${job.id.slice(0,8)}`}</h3>
                  <Badge className="bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[10px]">
                    {job.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono">{job.id}</p>
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setActiveTab("media");
                    }}
                    className="text-xs font-bold text-blue-700 h-8"
                  >
                    Manage Project Photos &rarr;
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SOCIAL MEDIA & CONTACT */}
      {activeTab === "social" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-[#0b2a4a]">Official Social Media &amp; Company Contact</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Social Links</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Facebook Handle / Page URL</label>
                <div className="flex gap-2">
                  <Input
                    value={settings.facebook_url || ""}
                    onChange={e => setSettings({ ...settings, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/haconstructionllc"
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant={settings.facebook_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, facebook_enabled: !settings.facebook_enabled })}
                    className="text-xs font-bold h-9 shrink-0"
                  >
                    {settings.facebook_enabled ? 'ACTIVE' : 'OFF'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Instagram Profile URL</label>
                <div className="flex gap-2">
                  <Input
                    value={settings.instagram_url || ""}
                    onChange={e => setSettings({ ...settings, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/haconstructionllc"
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant={settings.instagram_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, instagram_enabled: !settings.instagram_enabled })}
                    className="text-xs font-bold h-9 shrink-0"
                  >
                    {settings.instagram_enabled ? 'ACTIVE' : 'OFF'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">TikTok Profile URL</label>
                <div className="flex gap-2">
                  <Input
                    value={settings.tiktok_url || ""}
                    onChange={e => setSettings({ ...settings, tiktok_url: e.target.value })}
                    placeholder="https://tiktok.com/@haconstructionllc"
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant={settings.tiktok_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, tiktok_enabled: !settings.tiktok_enabled })}
                    className="text-xs font-bold h-9 shrink-0"
                  >
                    {settings.tiktok_enabled ? 'ACTIVE' : 'OFF'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">YouTube Channel URL</label>
                <div className="flex gap-2">
                  <Input
                    value={settings.youtube_url || ""}
                    onChange={e => setSettings({ ...settings, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/@haconstructionllc"
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant={settings.youtube_enabled ? "default" : "outline"}
                    onClick={() => setSettings({ ...settings, youtube_enabled: !settings.youtube_enabled })}
                    className="text-xs font-bold h-9 shrink-0"
                  >
                    {settings.youtube_enabled ? 'ACTIVE' : 'OFF'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Public Company Info</h3>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Official Phone</label>
                <Input value={settings.company_phone || ""} onChange={e => setSettings({ ...settings, company_phone: e.target.value })} placeholder="e.g. (207) 555-0123" className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Public Email</label>
                <Input value={settings.company_email || ""} onChange={e => setSettings({ ...settings, company_email: e.target.value })} placeholder="e.g. info@haconstructionllc.com" className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Public Address / Service Region</label>
                <Input value={settings.company_address || ""} onChange={e => setSettings({ ...settings, company_address: e.target.value })} placeholder="e.g. Southern Maine, USA" className="text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SEO & SERVICE AREAS */}
      {activeTab === "seo" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-[#0b2a4a]">SEO Metadata &amp; Service Region Towns</h2>

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
              <label className="text-xs font-bold text-slate-700 block mb-1">Service Area Towns (Southern Maine)</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newAreaInput}
                  onChange={e => setNewAreaInput(e.target.value)}
                  placeholder="Add town (e.g. Kennebunk)"
                  className="text-xs"
                />
                <Button onClick={handleAddArea} className="bg-slate-900 text-white font-bold text-xs h-9 shrink-0">
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

      {/* Modal for Category Edit (Visual Cover Image Selection) */}
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

            {/* Visual Cover Image Picker for Category */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Category Cover Photo</label>
                {editingCategory.cover_image_url && (
                  <button
                    onClick={() => setEditingCategory(prev => ({ ...prev, cover_image_url: null }))}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Clear Photo
                  </button>
                )}
              </div>

              <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                {editingCategory.cover_image_url ? (
                  <img src={editingCategory.cover_image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                    <span className="text-[11px] font-bold text-slate-400 block">No cover image selected</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <label className="px-3 py-1.5 rounded-lg bg-blue-900 text-white font-bold text-xs cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Upload Cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleUploadSingleForTarget(e.target.files[0], { type: "category_cover" })}
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerTarget({ type: "category_cover" })}
                  className="text-xs font-bold border-slate-300"
                >
                  <Images className="w-3 h-3 mr-1 text-blue-600" /> Select from Library
                </Button>
              </div>
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

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCategory.is_published ?? false}
                  onChange={e => setEditingCategory({ ...editingCategory, is_published: e.target.checked })}
                />
                Publish Category (Active on site)
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCategory.show_on_homepage ?? true}
                  onChange={e => setEditingCategory({ ...editingCategory, show_on_homepage: e.target.checked })}
                />
                Show on Homepage
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCategory.show_in_services_menu ?? true}
                  onChange={e => setEditingCategory({ ...editingCategory, show_in_services_menu: e.target.checked })}
                />
                Show in Services Menu
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

      {/* Centralized Media Library Image Selector Modal */}
      {pickerTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-[#0b2a4a]">
                Select Image from Central Media Library
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setPickerTarget(null)} className="font-bold">
                <X className="w-4 h-4 mr-1" /> Close
              </Button>
            </div>

            {allMedia.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-slate-500 font-bold">No photos uploaded in media library yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload photos in the "Media Library &amp; Upload" tab first.</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                {allMedia.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (m.signedUrl) {
                        if (pickerTarget.type === "hero_desktop") {
                          setSettings(prev => ({ ...prev, hero_image_url: m.signedUrl }));
                          toast.success("Desktop Hero image updated!");
                        } else if (pickerTarget.type === "hero_mobile") {
                          setSettings(prev => ({ ...prev, hero_mobile_image_url: m.signedUrl }));
                          toast.success("Mobile Hero image updated!");
                        } else if (pickerTarget.type === "category_cover" && editingCategory) {
                          setEditingCategory(prev => ({ ...prev, cover_image_url: m.signedUrl }));
                          toast.success("Category cover photo selected!");
                        }
                      }
                      setPickerTarget(null);
                    }}
                    className="aspect-video relative rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-600 cursor-pointer bg-slate-900 group shadow-2xs"
                  >
                    {m.signedUrl && <img src={m.signedUrl} alt={m.caption || "Media"} className="w-full h-full object-cover group-hover:scale-105 transition-all" />}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white font-bold text-xs p-2 text-center">
                      <span>Select Photo</span>
                      {m.caption && <span className="text-[10px] text-slate-300 truncate max-w-full font-normal mt-0.5">{m.caption}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
