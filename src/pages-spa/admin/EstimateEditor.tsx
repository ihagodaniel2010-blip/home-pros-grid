import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, CheckCircle2, CreditCard, FileText, Share2, Printer, Copy, Wrench, Wand2, Mail, PenTool, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";

import { useLanguage } from "@/context/LanguageContext";
import {
    getEstimateById,
    createEstimate,
    updateEstimate,
    Estimate,
    EstimateLineItem
} from "@/lib/estimates";
import { getAssistantDraftById, saveAssistantDraft } from "@/lib/estimate-assistant";
import { createServiceJob, getServiceJobByEstimateId } from "@/lib/service-jobs";
import { getCompanySettings, CompanySettings } from "@/lib/company-settings";
import { getLeads, parseLeadAddressComplete, cleanProjectScopeNotes } from "@/lib/leads";
import EstimateForm from "@/components/admin/estimates/EstimateForm";
import EstimateItemsTable from "@/components/admin/estimates/EstimateItemsTable";
import TotalsSummary from "@/components/admin/estimates/TotalsSummary";
import RegisterPaymentModal from "@/components/admin/estimates/RegisterPaymentModal";
import EstimateValidationModal from "@/components/admin/estimates/EstimateValidationModal";
import CountersignModal from "@/components/admin/estimates/CountersignModal";
import { generateProfessionalPDF } from "@/lib/pdf-generator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EstimateEditor = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get("leadId");
    const draftId = searchParams.get("draftId");
    const navigate = useNavigate();
    const { user, isLoading: isUserLoading } = useUser();
    const userRole = user?.organization?.role;
    const { t } = useLanguage();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCountersignModalOpen, setIsCountersignModalOpen] = useState(false);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isSendingSMS, setIsSendingSMS] = useState(false);
    const [leadContactPrefs, setLeadContactPrefs] = useState<string[]>([]);

    const handleSendEstimateEmail = async () => {
        if (userRole === 'worker') {
            toast.error("Workers are restricted from sending transactional emails.");
            return;
        }

        const email = formData.client_email || "";
        if (!email || !email.includes("@")) {
            toast.error("Please provide a valid customer email address in the estimate details.");
            return;
        }

        const estToken = formData.public_token || (id ? id : null);
        const estUrl = estToken ? `${window.location.origin}/estimate/${estToken}#contract` : "https://www.h-a-construction.com/";

        setIsSendingEmail(true);
        try {
            const res = await fetch("/api/admin/send-test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toEmail: email.trim(),
                    templateId: "estimate_sent_customer",
                    variables: {
                        customer_name: formData.client_name || "Valued Client",
                        project_type: formData.project_type || "Residential Construction Project",
                        total_amount: `$${(formData.total_amount || 0).toLocaleString()}`,
                        estimate_link: estUrl
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                const nowIso = new Date().toISOString();
                if (id) {
                    await updateEstimate(id, { status: 'Sent', sent_at: nowIso });
                }
                setFormData(prev => ({ ...prev, status: 'Sent', sent_at: nowIso }));
                toast.success(`Estimate email sent successfully! Status updated to Sent. (${data.messageId || "Dispatched"})`);
            } else {
                toast.error(`Email dispatch failed: ${data.message || "Provider unconfigured"}`);
            }
        } catch (err: any) {
            console.error("Estimate email dispatch error:", err);
            toast.error("Error sending estimate email. Please check server logs.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleSendEstimateSMS = async () => {
        if (userRole === 'worker') {
            toast.error("Workers are restricted from sending SMS.");
            return;
        }

        const phone = formData.client_phone || "";
        if (!phone || phone.trim().length < 7) {
            toast.error("Please provide a valid customer phone number in the estimate details.");
            return;
        }

        const estToken = formData.public_token || (id ? id : null);
        const estUrl = estToken ? `${window.location.origin}/estimate/${estToken}#contract` : "https://www.h-a-construction.com/";
        const messageText = `H&A Construction LLC: Your estimate for ${formData.project_type || 'your project'} is ready to review ($${(formData.total_amount || 0).toLocaleString()}). Please open this link: ${estUrl} . Reply or call us if you have questions.`;

        setIsSendingSMS(true);
        try {
            const res = await fetch("/api/admin/send-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    toPhone: phone.trim(),
                    message: messageText
                })
            });

            const data = await res.json();
            if (data.success) {
                const nowIso = new Date().toISOString();
                if (id) {
                    await updateEstimate(id, { status: 'Sent', sent_at: nowIso });
                }
                setFormData(prev => ({ ...prev, status: 'Sent', sent_at: nowIso }));
                toast.success(`Estimate SMS sent successfully! Status updated to Sent.`);
            } else {
                toast.error(`SMS dispatch notice: ${data.message || "Twilio unconfigured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER."}`);
            }
        } catch (err: any) {
            console.error("Estimate SMS dispatch error:", err);
            toast.error("Error sending estimate SMS. Please check server logs.");
        } finally {
            setIsSendingSMS(false);
        }
    };

    const getLocalTodayIsoDate = (): string => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayIsoDate = getLocalTodayIsoDate();

    const [formData, setFormData] = useState<Partial<Estimate>>({
        status: 'Draft',
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        valid_until: todayIsoDate,
        terms: "Payment due upon receipt. Proposal valid for 30 days."
    });

    const [items, setItems] = useState<EstimateLineItem[]>([]);
    const [serviceJob, setServiceJob] = useState<any>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (id) {
                const estimate = await getEstimateById(id);
                if (estimate) {
                    setFormData(estimate);
                    setItems(estimate.items || []);
                    const job = await getServiceJobByEstimateId(id);
                    if (job) setServiceJob(job);
                    if (estimate.lead_id) {
                        getLeads().then(leads => {
                            const l = leads.find(item => item.id === estimate.lead_id);
                            if (l && l.preferred_contact_methods) {
                                setLeadContactPrefs(l.preferred_contact_methods);
                            }
                        }).catch(() => {});
                    }
                }
            } else if (draftId) {
                const draft = await getAssistantDraftById(draftId);
                if (draft) {
                    setFormData(prev => ({
                        ...prev,
                        lead_id: draft.lead_id,
                        notes: draft.output.scopeOfWork,
                        project_type: draft.service_type
                    }));
                    
                    const newItems = [
                        ...draft.output.laborItems.map(li => ({
                            description: li.description,
                            quantity: li.quantity,
                            unit_price: li.unitPrice,
                            total_price: li.totalPrice
                        })),
                        ...draft.output.materialItems.map(mi => ({
                            description: mi.description,
                            quantity: mi.quantity,
                            unit_price: mi.unitPrice,
                            total_price: mi.totalPrice
                        }))
                    ];
                    
                    const extra = draft.output.totals.overheadAmount + draft.output.totals.profitAmount - draft.output.totals.discountAmount;
                    if (extra > 0) {
                        newItems.push({
                            description: "Project Management, Setup & Logistics",
                            quantity: 1,
                            unit_price: extra,
                            total_price: extra
                        });
                    }
                    
                    setItems(newItems);
                    calculateTotals(newItems, formData.tax_rate || 0, formData.discount_amount || 0);
                    
                    if (draft.lead_id) {
                        const leads = await getLeads();
                        const lead = leads.find(l => l.id === draft.lead_id);
                        if (lead) {
                            if (lead.preferred_contact_methods) setLeadContactPrefs(lead.preferred_contact_methods);
                            const parsedAddr = parseLeadAddressComplete(lead);
                            setFormData(prev => ({
                                ...prev,
                                client_name: lead.fullName,
                                client_email: lead.email,
                                client_phone: lead.phone,
                                client_address: parsedAddr.full_street_address || prev.client_address,
                                client_city: parsedAddr.city || prev.client_city,
                                client_state: parsedAddr.state || prev.client_state,
                                client_zip: parsedAddr.zip || prev.client_zip
                            }));
                        }
                    }
                }
            } else if (leadId) {
                const leads = await getLeads();
                const lead = leads.find(l => l.id === leadId);
                if (lead) {
                    if (lead.preferred_contact_methods) {
                        setLeadContactPrefs(lead.preferred_contact_methods);
                    }
                    const serviceInfo = lead.subtype
                        ? `${lead.selectedServiceOption} (${lead.subtype})`
                        : lead.selectedServiceOption;

                    let derivedProjectType = "";
                    if (lead.serviceSlug) {
                        const slugMap: Record<string, string> = {
                            gutters: "General Repair",
                            carpentry: "Custom Carpentry",
                            framing: "Framing",
                            remodel: "Kitchen Remodel",
                            roofing: "Roofing Repair",
                            siding: "Siding",
                            trim: "Trim Work"
                        };
                        derivedProjectType = slugMap[lead.serviceSlug.toLowerCase()] || "";
                    }

                    const parsedAddr = parseLeadAddressComplete(lead);
                    const cleanedNotes = cleanProjectScopeNotes(lead.details || lead.description);

                    setFormData(prev => ({
                        ...prev,
                        client_name: lead.fullName,
                        client_email: lead.email,
                        client_phone: lead.phone,
                        client_address: parsedAddr.full_street_address || prev.client_address,
                        client_city: parsedAddr.city || prev.client_city,
                        client_state: parsedAddr.state || prev.client_state,
                        client_zip: parsedAddr.zip || prev.client_zip,
                        lead_id: lead.id,
                        project_type: derivedProjectType || lead.selectedServiceOption || prev.project_type || "General Repair",
                        valid_until: getLocalTodayIsoDate(),
                        notes: cleanedNotes || `${t("estimate.converted_from")} [${serviceInfo}]`
                    }));
                }
            }

            // Load company settings
            const targetOrgId = user?.organization?.id;
            if (targetOrgId) {
                const settings = await getCompanySettings(targetOrgId);
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
    }, [id, leadId, draftId, t, user?.organization?.id, user?.id]);

    useEffect(() => {
        if (isUserLoading) return;
        loadData();
    }, [isUserLoading, user?.organization?.id, loadData]);


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
        const shareUrl = `${window.location.host.includes('localhost') ? 'http' : 'https'}://${window.location.host}/estimate/${slice}#contract`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Share link copied to clipboard!");
    };

    const [validationState, setValidationState] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        targetElementId?: string;
    }>({ isOpen: false, message: "" });

    const showValidationError = (message: string, targetElementId?: string, title?: string) => {
        setValidationState({
            isOpen: true,
            title: title || "Validation Required",
            message,
            targetElementId
        });
    };

    const handleGeneratePDF = async () => {
        if (!id) {
            showValidationError("Please save this estimate before generating a PDF.", undefined, "Save Estimate First");
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
        if (isSaving) return; // Prevent double submit

        const orgId = user?.organization?.id || DEFAULT_ORG_ID;

        // Step-by-step pre-save validations
        if (!formData.client_name || !formData.client_name.trim()) {
            showValidationError("Client Name is required.", "client_name");
            return;
        }

        if (!formData.project_type || !formData.project_type.trim()) {
            showValidationError("Project Type is required.", "project_type");
            return;
        }

        if (!formData.valid_until) {
            showValidationError("Valid Until date is required.", "valid_until");
            return;
        }

        if (!formData.status) {
            showValidationError("Status is required.", "status");
            return;
        }

        if (items.length === 0) {
            showValidationError("Please add at least one service item before saving this estimate.", "add-item-btn");
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.description || !item.description.trim()) {
                showValidationError(`Item #${i + 1}: Description is required.`, `item-desc-${i}`);
                return;
            }
            if ((item.quantity || 0) <= 0) {
                showValidationError(`Item #${i + 1}: Quantity must be greater than 0.`, `item-qty-${i}`);
                return;
            }
            if ((item.unit_price ?? -1) < 0) {
                showValidationError(`Item #${i + 1}: Unit Price must be valid (>= 0).`, `item-price-${i}`);
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                organization_id: orgId,
            } as Omit<Estimate, 'id' | 'created_at' | 'updated_at'>;

            if (id) {
                const updated = await updateEstimate(id, payload, items);
                if (!updated) {
                    throw new Error("Supabase update returned null record.");
                }
                toast.success("Estimate updated successfully.");
            } else {
                const created = await createEstimate(payload, items);
                if (!created) {
                    throw new Error("Supabase insert returned null record.");
                }
                toast.success("Estimate created successfully.");
                
                // If it came from a draft, mark draft as converted
                if (draftId) {
                    await saveAssistantDraft({ id: draftId, status: 'converted', organization_id: orgId, created_by: user?.id || 'system', input: {} as any, output: {} as any, service_type: 'converted' }).catch(() => {});
                }
            }
            navigate("/admin/estimates");
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(`Failed to save estimate: ${error?.message || "Database insert error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateJob = async () => {
        if (!id) {
            toast.error("Please save the estimate before creating a Service Job.");
            return;
        }

        const orgId = user?.organization?.id || DEFAULT_ORG_ID;
        setIsSaving(true);
        try {
            // Check if job already exists for this estimate
            let existingJob = await getServiceJobByEstimateId(id);
            let targetLeadId = existingJob?.lead_id || formData.lead_id;

            // If no lead container is linked to this estimate, create one so the job detail page is fully functional
            if (!targetLeadId && supabase) {
                const now = new Date().toISOString();
                const { data: newLead, error: leadErr } = await supabase
                    .from('leads')
                    .insert([{
                        organization_id: orgId,
                        fullName: formData.client_name || "Client",
                        email: formData.client_email || "",
                        phone: formData.client_phone || "",
                        address: formData.client_address || "",
                        zip: formData.client_zip || "",
                        serviceSlug: formData.project_type || "general-repair",
                        selectedServiceOption: formData.project_type || "General Repair",
                        locationType: "Home",
                        status: "converted",
                        statusHistory: [{ status: "converted", timestamp: now }]
                    }])
                    .select()
                    .single();

                if (!leadErr && newLead) {
                    targetLeadId = newLead.id;
                    await updateEstimate(id, { lead_id: newLead.id });
                    setFormData(prev => ({ ...prev, lead_id: newLead.id }));
                }
            }

            if (existingJob) {
                setServiceJob(existingJob);
                toast.info("Opening Job Workspace.");
                navigate(`/admin/jobs/${existingJob.id}`);
                return;
            }

            // Create new Service Job
            const job = await createServiceJob({
                organization_id: orgId,
                lead_id: targetLeadId || undefined,
                estimate_id: id,
                status: 'scheduled'
            });

            setServiceJob(job);
            toast.success("Service Job created successfully!");
            navigate(`/admin/jobs/${job.id}`);
        } catch (error: any) {
            console.error("Create Service Job Error:", error);
            toast.error(`Failed to create Service Job: ${error?.message || "Database insert error"}`);
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
        <div className="p-4 sm:p-8 max-w-5xl mx-auto">
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
                    {!id && (
                        <Button
                            variant="outline"
                            className="h-10 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50"
                            onClick={() => navigate(`/admin/estimate-assistant${leadId ? `?leadId=${leadId}` : ''}`)}
                        >
                            <Wand2 className="h-4 w-4" />
                            Smart Assistant
                        </Button>
                    )}
                    {id && (
                        <>
                            {formData.status === 'Approved' && (
                                <>
                                    <Button
                                        variant="outline"
                                        className="h-10 gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                                        onClick={() => setIsCountersignModalOpen(true)}
                                    >
                                        <PenTool className="h-4 w-4" />
                                        Countersign
                                    </Button>
                                    {!serviceJob && (
                                        <Button
                                            variant="outline"
                                            className="h-10 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                            onClick={handleCreateJob}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                                            Create Job
                                        </Button>
                                    )}
                                </>
                            )}
                            {serviceJob && (
                                <Button
                                    variant="outline"
                                    className="h-10 gap-2 border-green-200 text-green-700 hover:bg-green-50 font-bold"
                                    onClick={() => navigate(`/admin/jobs/${serviceJob.id}`)}
                                >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    Open Job Workspace
                                </Button>
                            )}


                            {(formData.status === 'Sent' || formData.status === 'Expired' || formData.status === 'Rejected') && (
                                <Button
                                    variant="outline"
                                    className="h-10 gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, status: 'Draft' }));
                                        toast.info("Estimate status set to Draft for revision. Click Save when finished.");
                                    }}
                                >
                                    <FileText className="h-4 w-4" />
                                    Revise / Edit Draft
                                </Button>
                            )}

                            {formData.status === 'Sent' && (
                                <Button
                                    variant="outline"
                                    className="h-10 gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                                    onClick={async () => {
                                        if (confirm("Mark estimate as approved manually by contractor?")) {
                                            setFormData(prev => ({ ...prev, status: 'Approved' }));
                                            await updateEstimate(id, { status: 'Approved', approved_at: new Date().toISOString() });
                                            toast.success("Estimate marked as Approved!");
                                        }
                                    }}
                                >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Mark Approved Manually
                                </Button>
                            )}

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
                                disabled={!formData.public_token}
                                title={!formData.public_token ? "Save the estimate to generate a public link" : "Copy public link"}
                            >
                                <Copy className="h-4 w-4" />
                                Copy public link
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-blue-200 text-blue-800 hover:bg-blue-50"
                                onClick={handleSendEstimateEmail}
                                disabled={isSendingEmail || userRole === 'worker'}
                                title={userRole === 'worker' ? "Worker role restricted" : "Send Estimate Email"}
                            >
                                {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Mail className="h-4 w-4 text-blue-600" />}
                                {formData.status === 'Sent' ? "Resend Email" : "Send Estimate Email"}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-semibold"
                                onClick={handleSendEstimateSMS}
                                disabled={isSendingSMS || userRole === 'worker'}
                                title={userRole === 'worker' ? "Worker role restricted" : "Send Estimate SMS"}
                            >
                                {isSendingSMS ? <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> : <Phone className="h-4 w-4 text-emerald-600" />}
                                Send Estimate SMS
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
                    {formData.status !== 'Approved' && (
                        <Button
                            className="h-10 bg-[#0b2a4a] hover:bg-[#081e35] text-white shadow-lg shadow-blue-900/10 min-w-[100px]"
                            onClick={() => handleSave()}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            {t("estimate.save")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Preferred Contact Methods Banner */}
            {leadContactPrefs.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 mb-6 flex items-center justify-between gap-3 text-amber-900 shadow-sm text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase tracking-wider text-amber-950">
                            Client Preferred Contact Methods:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {leadContactPrefs.map(method => (
                                <Badge key={method} variant="secondary" className="bg-amber-200/60 text-amber-900 border-amber-300 font-bold px-2.5 py-0.5 rounded-lg text-xs">
                                    ✓ {method}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Contextual Status Banners */}
            {formData.status === 'Sent' && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-blue-900 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600 shrink-0" />
                        <div>
                            <p className="font-bold text-sm">Estimate Sent to Client</p>
                            <p className="text-xs text-blue-700">Awaiting client decision or e-signature via public proposal link. You can resend, copy public link, or revise if needed.</p>
                        </div>
                    </div>
                </div>
            )}

            {formData.status === 'Approved' && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-900 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                            <p className="font-bold text-sm">Estimate Approved &amp; Commercial Terms Frozen</p>
                            <p className="text-xs text-emerald-700">This commercial proposal is approved and locked from direct edits. To adjust scope or pricing, use Change Orders / Service Extras.</p>
                        </div>
                    </div>
                </div>
            )}

            {formData.status === 'Expired' && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900 shadow-sm">
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-amber-600 shrink-0" />
                        <div>
                            <p className="font-bold text-sm">Estimate Expired</p>
                            <p className="text-xs text-amber-700">The validity period has passed. Click "Revise / Edit Draft" to extend validity or update pricing.</p>
                        </div>
                    </div>
                </div>
            )}

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
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8">
                    <EstimateForm
                        formData={formData}
                        onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
                        readOnly={formData.status === 'Approved'}
                    />
                </section>

                {/* Items Section */}
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
                    </div>

                    <EstimateItemsTable
                        items={items}
                        onChange={handleItemsChange}
                        readOnly={formData.status === 'Approved'}
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

            <EstimateValidationModal
                isOpen={validationState.isOpen}
                title={validationState.title}
                message={validationState.message}
                targetElementId={validationState.targetElementId}
                onClose={() => setValidationState(prev => ({ ...prev, isOpen: false }))}
            />

            {id && (
                <CountersignModal
                    isOpen={isCountersignModalOpen}
                    onClose={() => setIsCountersignModalOpen(false)}
                    estimate={formData as Estimate}
                    companySettings={companySettings}
                    onCountersigned={() => loadData()}
                />
            )}
        </div>
    );
};

export default EstimateEditor;
