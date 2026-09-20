import { useEffect, useState } from "react";
import { fetchAdminSession } from "@/lib/admin-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Building2, Upload, Users, Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { getCompanySettings, saveCompanySettings, CompanySettings as CompanySettingsType } from "@/lib/company-settings";
import { getOrganizationPartners, saveCompanyOwnershipStructure, OrganizationPartner } from "@/lib/partners";
import { supabase } from "@/lib/supabase";

const CompanySettings = () => {
    const { t } = useLanguage();
    const { user, isLoading: isUserLoading } = useUser();
    const orgId = user?.organization?.id;
    const userRole = user?.organization?.role || "owner";
    const isFinancialManager = ["owner", "admin", "contractor", "super_admin"].includes(userRole);

    const [settings, setSettings] = useState<Partial<CompanySettingsType>>({
        company_name: "",
        logo_url: "",
        phone: "",
        email: "",
        address: "",
        license_number: "",
        insurance_info: "",
        default_tax_rate: 0,
        default_footer: "",
        default_terms: "",
        business_ownership_type: "single_owner"
    });

    const [partners, setPartners] = useState<Partial<OrganizationPartner>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isUserLoading) return;

        let active = true;
        setIsLoading(true);

        const targetOrgId = orgId || DEFAULT_ORG_ID;

        Promise.all([
            getCompanySettings(targetOrgId),
            getOrganizationPartners(targetOrgId)
        ])
            .then(([settingsData, partnersData]) => {
                if (!active) return;

                if (settingsData) {
                    setSettings({
                        ...settingsData,
                        default_footer: settingsData.default_footer || "",
                        business_ownership_type: settingsData.business_ownership_type || "single_owner"
                    });
                }

                if (partnersData && partnersData.length > 0) {
                    setPartners(partnersData);
                } else {
                    // Initial default draft for partnership mode if no partners exist in DB
                    setPartners([
                        { id: `temp_1`, name: "Hugo (Manager)", email: "hugo@ha-construction.com", ownership_percentage: 50, active: true },
                        { id: `temp_2`, name: "Partner B", email: "partner@ha-construction.com", ownership_percentage: 50, active: true }
                    ]);
                }
            })
            .catch(error => {
                console.error("Error loading company settings & partners:", error);
                if (active) toast.error("Failed to load company profile settings");
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isUserLoading, orgId]);

    const activePartners = partners.filter(p => p.active !== false);
    const totalOwnershipPct = activePartners.reduce((sum, p) => sum + (Number(p.ownership_percentage) || 0), 0);
    const isOwnershipValid = Math.abs(totalOwnershipPct - 100) <= 0.01;

    const handleSave = async () => {
        const targetOrgId = user?.organization?.id || DEFAULT_ORG_ID;

        if (settings.business_ownership_type === 'partnership' && !isOwnershipValid) {
            toast.error(`Total Active Partner Ownership must equal EXACTLY 100.00%. Current active total: ${totalOwnershipPct.toFixed(2)}%`);
            return;
        }

        setIsSaving(true);
        try {
            // 1. Save company profile fields (contact, logo, tax, legal terms)
            await saveCompanySettings({
                ...settings,
                organization_id: targetOrgId
            });

            // 2. Save ownership structure & partners atomically/transactionally
            const ownershipResult = await saveCompanyOwnershipStructure(
                targetOrgId,
                settings.business_ownership_type || 'single_owner',
                partners
            );

            if (!ownershipResult.success) {
                toast.error(ownershipResult.error || "Failed to save ownership structure");
                return;
            }

            toast.success(t("settings.save_success"));

            // Reload fresh persisted state from DB
            const [freshSettings, freshPartners] = await Promise.all([
                getCompanySettings(targetOrgId),
                getOrganizationPartners(targetOrgId)
            ]);

            if (freshSettings) setSettings(freshSettings);
            if (freshPartners && freshPartners.length > 0) setPartners(freshPartners);
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || t("settings.save_error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const targetOrgId = user?.organization?.id || DEFAULT_ORG_ID;
        if (!file || !targetOrgId) return;

        setIsUploading(true);
        try {
            // 1. Process image through Canvas for client-side resizing (max 512px)
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxDim = 512;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxDim) {
                                height = Math.round((height * maxDim) / width);
                                width = maxDim;
                            }
                        } else {
                            if (height > maxDim) {
                                width = Math.round((width * maxDim) / height);
                                height = maxDim;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/png', 0.9));
                        } else {
                            resolve(event.target?.result as string);
                        }
                    };
                    img.onerror = () => resolve(event.target?.result as string);
                    img.src = event.target?.result as string;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 2. Try storage upload if available, fallback to Data URL
            let finalLogoUrl = dataUrl;
            try {
                const fileName = `${targetOrgId}/logo-${Date.now()}.png`;
                const filePath = `logos/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
                    if (publicUrl) finalLogoUrl = publicUrl;
                }
            } catch (storageErr) {
                console.warn("Storage bucket upload handled, using optimized Data URL fallback:", storageErr);
            }

            const updatedSettings = {
                ...settings,
                logo_url: finalLogoUrl,
                organization_id: targetOrgId
            };

            setSettings(updatedSettings);
            await saveCompanySettings(updatedSettings);
            toast.success("Company logo updated and saved successfully!");
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.message || "Failed to upload logo");
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse text-sm">Loading company settings...</p>
            </div>
        );
    }

    if (!isFinancialManager) {
        return (
            <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                    Company Profile, Business Structure, and Partner Financial Settings are restricted to Financial Managers (Owners, Admins, Contractors).
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-32 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
                        Company Profile & Ownership
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Manage company profile, tax defaults, and partner accounting structure.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-60 active:scale-[0.98]"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t("admin.save")}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column - Logo & Tax */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm text-center">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-4">Company Logo</Label>
                        <div className="relative w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 group">
                            {settings.logo_url ? (
                                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Building2 className="h-10 w-10 text-slate-300" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="cursor-pointer p-2 rounded-full bg-white text-primary">
                                    <Upload className="h-5 w-5" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                                </label>
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">Upload any PNG or JPG logo. Automatically optimized and cropped.</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-4">Tax Configuration</Label>
                        <div className="space-y-2">
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={settings.default_tax_rate ?? ""}
                                    onChange={(e) => setSettings({ ...settings, default_tax_rate: parseFloat(e.target.value) || 0 })}
                                    className="h-12 pr-12 font-bold text-lg rounded-xl"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Default tax rate applied to new estimates.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column - Contact & Ownership */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
                        <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Name</Label>
                                <Input
                                    value={settings.company_name ?? ""}
                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    placeholder="H&A Construction LLC"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Public Email</Label>
                                <Input
                                    value={settings.email ?? ""}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    placeholder="contact@ha-construction.com"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Phone</Label>
                                <Input
                                    value={settings.phone ?? ""}
                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                    placeholder="(555) 000-0000"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">License Number</Label>
                                <Input
                                    value={settings.license_number ?? ""}
                                    onChange={(e) => setSettings({ ...settings, license_number: e.target.value })}
                                    placeholder="HIC-123456"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Address</Label>
                                <Input
                                    value={settings.address ?? ""}
                                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                    placeholder="Street, City, Zip"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Business Ownership & Partner Accounting Section (Requirement 1 - 9) */}
                    <div id="company-ownership" className="bg-white rounded-2xl border border-slate-200/60 p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    Business Structure & Partner Ownership
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Configure corporate entity mode and partner allocation shares.</p>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border w-fit ${
                                settings.business_ownership_type === 'partnership'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                                {settings.business_ownership_type === 'partnership' ? 'Partnership (Multiple Partners)' : 'Single Owner'}
                            </span>
                        </div>

                        {/* Mode Selector */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Ownership Type</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setSettings(prev => ({ ...prev, business_ownership_type: 'single_owner' }))}
                                    className={`p-4 rounded-xl border text-left transition-all ${
                                        (settings.business_ownership_type || 'single_owner') === 'single_owner'
                                            ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <p className="font-bold text-sm">Single Owner</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Sole proprietorship or 100% single owner LLC. Partner accounting is disabled.</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSettings(prev => ({ ...prev, business_ownership_type: 'partnership' }))}
                                    className={`p-4 rounded-xl border text-left transition-all ${
                                        settings.business_ownership_type === 'partnership'
                                            ? 'bg-purple-50/80 border-purple-500 text-purple-900 ring-2 ring-purple-500/20'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <p className="font-bold text-sm">Partnership</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Multiple business partners sharing 100.00% ownership equity & expenses.</p>
                                </button>
                            </div>
                        </div>

                        {/* Partnership Partner CRUD Section */}
                        {settings.business_ownership_type === 'partnership' && (
                            <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Partner Roster & Equity Allocations
                                        </Label>
                                        <p className="text-[11px] text-slate-500">Active partner ownership percentages must sum to exactly 100.00%.</p>
                                    </div>

                                    {/* 100% Validation Indicator */}
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                        isOwnershipValid
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-red-50 text-red-800 border-red-200 animate-pulse'
                                    }`}>
                                        {isOwnershipValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                                        <span>Total Ownership: {totalOwnershipPct.toFixed(2)}%</span>
                                    </div>
                                </div>

                                {!isOwnershipValid && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        <span>Active partner percentage total is currently {totalOwnershipPct.toFixed(2)}%. Adjust partner shares to reach exactly 100.00% before saving.</span>
                                    </div>
                                )}

                                {/* Mobile-first Cards for Partners */}
                                <div className="space-y-3">
                                    {partners.map((partner, index) => (
                                        <div key={partner.id || index} className={`p-4 rounded-xl border space-y-3 transition-all ${
                                            partner.active === false
                                                ? 'bg-gray-50 border-gray-200 opacity-60'
                                                : 'bg-slate-50 border-slate-200/80 shadow-sm'
                                        }`}>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                                {/* Partner Name */}
                                                <div className="sm:col-span-5 space-y-1">
                                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Partner Name</Label>
                                                    <Input
                                                        placeholder="e.g. Hugo Manager"
                                                        value={partner.name || ""}
                                                        onChange={(e) => {
                                                            const updated = [...partners];
                                                            updated[index] = { ...updated[index], name: e.target.value };
                                                            setPartners(updated);
                                                        }}
                                                        className="h-10 bg-white font-medium text-xs rounded-lg"
                                                    />
                                                </div>

                                                {/* Partner Email */}
                                                <div className="sm:col-span-4 space-y-1">
                                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Email (Optional)</Label>
                                                    <Input
                                                        placeholder="e.g. partner@company.com"
                                                        value={partner.email || ""}
                                                        onChange={(e) => {
                                                            const updated = [...partners];
                                                            updated[index] = { ...updated[index], email: e.target.value };
                                                            setPartners(updated);
                                                        }}
                                                        className="h-10 bg-white text-xs rounded-lg"
                                                    />
                                                </div>

                                                {/* Ownership % */}
                                                <div className="sm:col-span-3 space-y-1 relative">
                                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Ownership %</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max="100"
                                                            placeholder="50"
                                                            value={partner.ownership_percentage ?? ""}
                                                            onChange={(e) => {
                                                                const updated = [...partners];
                                                                updated[index] = { ...updated[index], ownership_percentage: parseFloat(e.target.value) || 0 };
                                                                setPartners(updated);
                                                            }}
                                                            className="h-10 bg-white pr-7 font-bold text-xs text-right rounded-lg"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...partners];
                                                        updated[index] = { ...updated[index], active: !updated[index].active };
                                                        setPartners(updated);
                                                    }}
                                                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                                        partner.active !== false
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : 'bg-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    {partner.active !== false ? '✓ Active Partner' : 'Disabled (Inactive)'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...partners];
                                                        updated[index] = { ...updated[index], active: false };
                                                        setPartners(updated);
                                                        toast.info(`Partner ${partner.name || ''} marked inactive.`);
                                                    }}
                                                    className="text-slate-400 hover:text-red-600 font-bold flex items-center gap-1 text-[11px] transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Deactivate
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setPartners(prev => [
                                            ...prev,
                                            { id: `temp_${Date.now()}`, name: "", email: "", ownership_percentage: 0, active: true }
                                        ]);
                                    }}
                                    className="w-full sm:w-auto text-xs font-bold text-primary border-primary/30 hover:bg-primary/5 rounded-xl gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Partner
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Legal & Terms */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
                        <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Legal & Footer
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Insurance Info (Optional)</Label>
                                <Input
                                    value={settings.insurance_info ?? ""}
                                    onChange={(e) => setSettings({ ...settings, insurance_info: e.target.value })}
                                    placeholder="General Liability Policy #..."
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Footer Note</Label>
                                <Textarea
                                    value={settings.default_footer ?? ""}
                                    onChange={(e) => setSettings({ ...settings, default_footer: e.target.value })}
                                    placeholder="Thank you for your business!"
                                    className="min-h-[80px] rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Terms & Conditions</Label>
                                <Textarea
                                    value={settings.default_terms ?? ""}
                                    onChange={(e) => setSettings({ ...settings, default_terms: e.target.value })}
                                    placeholder="50% deposit required to start..."
                                    className="min-h-[120px] rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;
