import { useEffect, useState } from "react";
import { fetchAdminSession } from "@/lib/admin-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Building2, Upload } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import { getCompanySettings, saveCompanySettings, CompanySettings as CompanySettingsType } from "@/lib/company-settings";
import { supabase } from "@/lib/supabase";

const CompanySettings = () => {
    const { t } = useLanguage();
    const { user } = useUser();
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
        default_terms: ""
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            if (!user?.organization?.id) return;
            setIsLoading(true);
            try {
                const data = await getCompanySettings(user.organization.id);
                if (data) {
                    setSettings(data);
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [user]);

    const handleSave = async () => {
        if (!user?.organization?.id) {
            toast.error("Organization ID missing");
            return;
        }

        setIsSaving(true);
        try {
            await saveCompanySettings({
                ...settings,
                organization_id: user.organization.id
            });
            toast.success(t("settings.save_success"));
        } catch (error) {
            console.error("Save error:", error);
            toast.error(t("settings.save_error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.organization?.id) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.organization.id}/logo-${Math.random()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            setSettings(prev => ({ ...prev, logo_url: publicUrl }));
            toast.success("Logo uploaded successfully");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload logo");
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

    return (
        <div className="p-8 max-w-4xl mx-auto pb-32">
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
                        {t("admin.company")}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Manage your professional company profile for estimates and invoices.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column - Logo */}
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
                        <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">Recommended size: 512x512px. JPG or PNG.</p>
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
                                    value={settings.default_tax_rate}
                                    onChange={(e) => setSettings({ ...settings, default_tax_rate: parseFloat(e.target.value) || 0 })}
                                    className="h-12 pr-12 font-bold text-lg rounded-xl"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Default tax rate applied to new estimates.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column - Info */}
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
                                    value={settings.company_name}
                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    placeholder="ACME Corp"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Public Email</Label>
                                <Input
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    placeholder="contact@company.com"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Phone</Label>
                                <Input
                                    value={settings.phone}
                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                    placeholder="(555) 000-0000"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">License Number</Label>
                                <Input
                                    value={settings.license_number}
                                    onChange={(e) => setSettings({ ...settings, license_number: e.target.value })}
                                    placeholder="CSL-123456"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Business Address</Label>
                                <Input
                                    value={settings.address}
                                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                    placeholder="Street, City, Zip"
                                    className="h-12 rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
                        <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Legal & Footer
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Insurance Info (Optional)</Label>
                                <Input
                                    value={settings.insurance_info}
                                    onChange={(e) => setSettings({ ...settings, insurance_info: e.target.value })}
                                    placeholder="General Liability Policy #..."
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Footer Note</Label>
                                <Textarea
                                    value={settings.default_footer}
                                    onChange={(e) => setSettings({ ...settings, default_footer: e.target.value })}
                                    placeholder="Thank you for your business!"
                                    className="min-h-[80px] rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Terms & Conditions</Label>
                                <Textarea
                                    value={settings.default_terms}
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
