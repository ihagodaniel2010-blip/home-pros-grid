import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, CheckCircle2 } from "lucide-react";
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
import { getLeads } from "@/lib/leads";
import EstimateForm from "@/components/admin/estimates/EstimateForm";
import EstimateItemsTable from "@/components/admin/estimates/EstimateItemsTable";
import TotalsSummary from "@/components/admin/estimates/TotalsSummary";
import { toast } from "sonner";

const EstimateEditor = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get("leadId");
    const navigate = useNavigate();
    const { user } = useUser();
    const { t } = useLanguage();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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
        } catch (error) {
            console.error("Error loading data:", error);
            toast.error("Failed to load data.");
        } finally {
            setIsLoading(false);
        }
    }, [id, leadId, t]);

    useEffect(() => {
        if (user?.organization?.id) {
            loadData();
        }
    }, [user, loadData]);

    const calculateTotals = (currentItems: EstimateLineItem[], tax: number, discount: number) => {
        const subtotal = currentItems.reduce((acc, item) => acc + (item.total_price || 0), 0);
        const total = subtotal + tax - discount;

        setFormData(prev => ({
            ...prev,
            subtotal,
            tax_amount: tax,
            discount_amount: discount,
            total_amount: total
        }));
    };

    const handleItemsChange = (newItems: EstimateLineItem[]) => {
        setItems(newItems);
        calculateTotals(newItems, formData.tax_amount || 0, formData.discount_amount || 0);
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

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate("/admin/estimates")}
                        className="rounded-full h-10 w-10 border-gray-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {id ? t("estimate.edit_title") : t("estimate.create_title")}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {id ? `ID: ${id.split('-')[0].toUpperCase()}` : t("estimate.create_desc")}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate("/admin/estimates")}>
                        {t("estimate.cancel")}
                    </Button>
                    <Button
                        className="bg-[#0b2a4a] hover:bg-[#081e35] text-white shadow-lg"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {t("estimate.save")}
                    </Button>
                </div>
            </div>

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
                    <EstimateItemsTable
                        items={items}
                        onChange={handleItemsChange}
                    />

                    <div className="mt-8 border-t border-gray-100 -mx-8">
                        <TotalsSummary
                            subtotal={formData.subtotal || 0}
                            tax_amount={formData.tax_amount || 0}
                            discount_amount={formData.discount_amount || 0}
                            total_amount={formData.total_amount || 0}
                            onTaxChange={(val) => calculateTotals(items, val, formData.discount_amount || 0)}
                            onDiscountChange={(val) => calculateTotals(items, formData.tax_amount || 0, val)}
                        />
                    </div>
                </section>

                {/* Bottom Action Bar */}
                <div className="flex justify-end pt-4">
                    <Button
                        size="lg"
                        className="bg-[#0b2a4a] hover:bg-[#081e35] text-white px-8 h-12 rounded-xl shadow-xl shadow-blue-900/10 flex items-center gap-2"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        {t("estimate.save")}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EstimateEditor;
