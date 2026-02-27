import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, CheckCircle2, CreditCard, FileText, Share2, Printer, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import {
    getEstimateById,
    createEstimate,
    updateEstimate,
    Estimate,
    EstimateLineItem
} from "@/lib/estimates";
import { getCompanySettings, CompanySettings } from "@/lib/company-settings";
import { getLeads } from "@/lib/leads";
import EstimateForm from "@/components/admin/estimates/EstimateForm";
import EstimateItemsTable from "@/components/admin/estimates/EstimateItemsTable";
import TotalsSummary from "@/components/admin/estimates/TotalsSummary";
import RegisterPaymentModal from "@/components/admin/estimates/RegisterPaymentModal";
import { generateProfessionalPDF } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EstimateEditor = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get("leadId");
    const navigate = useNavigate();
    const { user } = useUser();
    const { t } = useLanguage();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const [formData, setFormData] = useState<Partial<Estimate>>({
        status: 'Draft',
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        terms: "Payment due upon receipt. Proposal valid for 30 days."
    });

    const [items, setItems] = useState<EstimateLineItem[]>([]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (id) {
                const estimate = await getEstimateById(id);
                if (estimate) {
                    setFormData(estimate);
                    setItems(estimate.items || []);
                }
            } else if (leadId) {
                const leads = await getLeads();
                const lead = leads.find(l => l.id === leadId);
                if (lead) {
                    const serviceInfo = lead.subtype
                        ? `${lead.selectedServiceOption} (${lead.subtype})`
                        : lead.selectedServiceOption;

                    setFormData(prev => ({
                        ...prev,
                        client_name: lead.fullName,
                        client_email: lead.email,
                        client_phone: lead.phone,
                        lead_id: lead.id,
                        notes: `${t("estimate.converted_from")} [${serviceInfo}]: ${lead.details || 'No details provided.'}`
                    }));
                }
            }

            // Load company settings
            if (user?.organization?.id) {
                const settings = await getCompanySettings(user.organization.id);
                setCompanySettings(settings);
                if (settings && !id) {
                    setFormData(prev => ({
                        ...prev,
                        tax_rate: settings.default_tax_rate || 0,
                        terms: settings.default_terms || prev.terms,
                        amount_paid: 0,
                        balance_due: 0,
                        payment_status: 'unpaid'
                    }));
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    }, [id, leadId, t, user]);

    useEffect(() => {
        if (user?.organization?.id) {
            loadData();
        }
    }, [user, loadData]);

    const calculateTotals = (currentItems: EstimateLineItem[], taxRate: number, discount: number) => {
        const subtotal = currentItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
        const taxAmount = (subtotal * taxRate) / 100;
        const total = subtotal + taxAmount - discount;
        const paid = formData.amount_paid || 0;

        setFormData(prev => ({
            ...prev,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            discount_amount: discount,
            total_amount: total,
            balance_due: total - paid,
            payment_status: total - paid <= 0 ? 'paid' : (paid > 0 ? 'partially_paid' : 'unpaid')
        }));
    };

    const handleItemsChange = (newItems: EstimateLineItem[]) => {
        setItems(newItems);
        calculateTotals(newItems, formData.tax_rate || 0, formData.discount_amount || 0);
    };

    const handleShare = () => {
        if (!formData.public_token) {
            toast.error("Public token missing. Save the estimate first.");
            return;
        }
        const slice = formData.public_token;
        const shareUrl = `${window.location.host.includes('localhost') ? 'http' : 'https'}://${window.location.host}/estimate/view/${slice}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Share link copied to clipboard!");
    };

    const handleGeneratePDF = async () => {
        if (!id) {
            toast.error("Save the estimate first to generate PDF.");
            return;
        }
        setIsGeneratingPDF(true);
        try {
            await generateProfessionalPDF(formData as Estimate, companySettings, {});
            toast.success("PDF generated successfully!");

            // Auto update status to Sent if it was Draft
            if (formData.status === 'Draft') {
                await updateEstimate(id, { status: 'Sent' });
                setFormData(prev => ({ ...prev, status: 'Sent' }));
            }
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF.");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSave = async () => {
        if (!user?.organization?.id) {
            toast.error("Organization context missing.");
            return;
        }

        if (!formData.client_name) {
            toast.error("Client name is required.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                organization_id: user.organization.id,
            } as Omit<Estimate, 'id' | 'created_at' | 'updated_at'>;

            if (id) {
                await updateEstimate(id, payload, items);
                toast.success("Estimate updated successfully.");
            } else {
                await createEstimate(payload, items);
                toast.success("Estimate created successfully.");
            }
            navigate("/admin/estimates");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save estimate.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate("/admin/estimates")}
                        className="rounded-full h-10 w-10 border-gray-200 mt-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {id ? t("estimate.edit_title") : t("estimate.create_title")}
                            </h1>
                            {id && (
                                <Badge variant="outline" className={cn("capitalize px-3 py-0.5", getStatusColor(formData.status || ""))}>
                                    {t(`admin.status.${(formData.status || 'Draft').toLowerCase()}`)}
                                </Badge>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm">
                            {id ? `ID: ${id.split('-')[0].toUpperCase()}` : t("estimate.create_desc")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {id && (
                        <>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-gray-200"
                                onClick={handleGeneratePDF}
                                disabled={isGeneratingPDF}
                            >
                                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-gray-200"
                                onClick={handleShare}
                            >
                                <Copy className="h-4 w-4" />
                                Share
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-gray-200"
                                onClick={() => setIsPaymentModalOpen(true)}
                            >
                                <CreditCard className="h-4 w-4" />
                                {t("admin.payment.register")}
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        className="h-10 border-gray-200"
                        onClick={() => navigate("/admin/estimates")}
                    >
                        {t("estimate.cancel")}
                    </Button>
                    <Button
                        className="h-10 bg-[#0b2a4a] hover:bg-[#081e35] text-white shadow-lg shadow-blue-900/10 min-w-[100px]"
                        onClick={() => handleSave()}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {t("estimate.save")}
                    </Button>
                </div>
            </div>

            {/* Financial Overview Cards */}
            {id && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grand Total</p>
                        <p className="text-2xl font-bold text-gray-900">${(formData.total_amount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-emerald-500">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">{t("admin.payment.paid")}</p>
                        <p className="text-2xl font-bold text-emerald-700">${(formData.amount_paid || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">{t("admin.payment.balance")}</p>
                        <p className="text-2xl font-bold text-orange-700">${(formData.balance_due ?? (formData.total_amount || 0)).toLocaleString()}</p>
                    </div>
                </div>
            )}

            <div className="space-y-8 pb-32">
                {/* Main Form Section */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                    <EstimateForm
                        formData={formData}
                        onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
                    />
                </section>

                {/* Items Section */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
                    </div>

                    <EstimateItemsTable
                        items={items}
                        onChange={handleItemsChange}
                    />

                    <div className="mt-8 border-t border-gray-100 -mx-8">
                        <TotalsSummary
                            subtotal={formData.subtotal || 0}
                            tax_rate={formData.tax_rate || 0}
                            tax_amount={formData.tax_amount || 0}
                            discount_amount={formData.discount_amount || 0}
                            total_amount={formData.total_amount || 0}
                            onTaxRateChange={(val) => calculateTotals(items, val, formData.discount_amount || 0)}
                            onDiscountChange={(val) => calculateTotals(items, formData.tax_rate || 0, val)}
                            onRecalculate={() => calculateTotals(items, formData.tax_rate || 0, formData.discount_amount || 0)}
                        />
                    </div>
                </section>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-500 italic">
                        * All changes are saved to the secure cloud.
                    </div>
                    <Button
                        size="lg"
                        className="bg-[#0b2a4a] hover:bg-[#081e35] text-white px-8 h-12 rounded-xl shadow-xl shadow-blue-900/10 flex items-center gap-2"
                        onClick={() => handleSave()}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        {t("estimate.save")}
                    </Button>
                </div>
            </div>

            {id && user?.organization?.id && (
                <RegisterPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    estimateId={id}
                    organizationId={user.organization.id}
                    remainingBalance={formData.balance_due ?? (formData.total_amount || 0)}
                    onSuccess={() => loadData()}
                />
            )}
        </div>
    );
};

export default EstimateEditor;
