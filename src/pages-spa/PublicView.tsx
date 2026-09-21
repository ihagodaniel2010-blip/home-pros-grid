import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getEstimateByToken, approveEstimate, rejectEstimate, updateEstimate, Estimate } from "@/lib/estimates";
import { getServiceJobByEstimateId } from "@/lib/service-jobs";
import { getServiceExtrasByJobId, getServiceExtrasByJobOrEstimateId, respondPublicServiceExtra, ServiceExtra, cleanReasonForDisplay } from "@/lib/service-extras";
import { getExpenses, Expense } from "@/lib/expenses";
import { getClientPayments, ClientPayment, createClientPayment } from "@/lib/client-payments";
import { getJobMediaRecords, getExtraMediaRecords, resolveSignedMediaUrl, ServiceJobMediaRecord, ServiceExtraMediaRecord } from "@/lib/job-media";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { 
    Loader2, CheckCircle2, FileText, Download, ShieldCheck, PenTool, CheckSquare, 
    Square, AlertCircle, Plus, Eye, Tag, Receipt, Images, X, ChevronRight, Share2, 
    Printer, ExternalLink, Lock, Clock, Sparkles, Check, Image as ImageIcon, Folder, 
    DollarSign, ArrowRight, Building2, MapPin, Phone, Mail, Calendar, Info, Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/common/SignaturePad";
import { generateProfessionalPDF, generateChangeOrderPDF, generatePaymentCancellationPDF } from "@/lib/pdf-generator";
import { getCompanySettings, CompanySettings } from "@/lib/company-settings";

const PublicView = () => {
    const { token } = useParams<{ token: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [serviceJob, setServiceJob] = useState<any | null>(null);
    const [extras, setExtras] = useState<ServiceExtra[]>([]);
    const [extraMediaMap, setExtraMediaMap] = useState<Record<string, { record: ServiceExtraMediaRecord; url: string }[]>>({});
    const [clientMaterials, setClientMaterials] = useState<Expense[]>([]);
    const [clientMedia, setClientMedia] = useState<ServiceJobMediaRecord[]>([]);
    const [clientMediaUrls, setClientMediaUrls] = useState<Record<string, string>>({});
    const [materialReceiptUrls, setMaterialReceiptUrls] = useState<Record<string, string>>({});
    const [payments, setPayments] = useState<ClientPayment[]>([]);
    const [company, setCompany] = useState<CompanySettings | null>(null);

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'overview' | 'contract' | 'extras' | 'photos' | 'materials' | 'payments' | 'documents'>('overview');
    const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [isDeclined, setIsDeclined] = useState(false);

    // Change Order E-Signature Modal UI state
    const [extraToApprove, setExtraToApprove] = useState<ServiceExtra | null>(null);
    const [extraConsentElectronic, setExtraConsentElectronic] = useState(false);
    const [extraConsentScope, setExtraConsentScope] = useState(false);
    const [extraSignerName, setExtraSignerName] = useState("");
    const [extraSignerEmail, setExtraSignerEmail] = useState("");
    const [extraSignatureDataUrl, setExtraSignatureDataUrl] = useState<string | null>(null);
    const [extraValidationError, setExtraValidationError] = useState<string | null>(null);
    const [isApprovingExtra, setIsApprovingExtra] = useState(false);

    // Contract E-Signature Form State
    const [consentElectronic, setConsentElectronic] = useState(false);
    const [consentScope, setConsentScope] = useState(false);
    const [signerName, setSignerName] = useState("");
    const [signerEmail, setSignerEmail] = useState("");
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Client Report Payment Modal State
    const [isReportPaymentOpen, setIsReportPaymentOpen] = useState(false);
    const [reportPaymentType, setReportPaymentType] = useState<'contract' | 'material'>('contract');
    const [reportPaymentAmount, setReportPaymentAmount] = useState('');
    const [reportPaymentDate, setReportPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [reportPaymentMethod, setReportPaymentMethod] = useState<'zelle' | 'check' | 'cash' | 'venmo' | 'card' | 'bank_transfer'>('zelle');
    const [reportPaymentFile, setReportPaymentFile] = useState<File | null>(null);
    const [reportPaymentFileUrl, setReportPaymentFileUrl] = useState<string | null>(null);
    const [reportPaymentNotes, setReportPaymentNotes] = useState('');
    const [isSubmittingReportPayment, setIsSubmittingReportPayment] = useState(false);

    const handleReportPaymentSubmit = async () => {
        if (!estimate || !reportPaymentAmount || parseFloat(reportPaymentAmount) <= 0) {
            toast.error("Por favor, informe um valor válido para o pagamento.");
            return;
        }

        setIsSubmittingReportPayment(true);
        try {
            const amount = parseFloat(reportPaymentAmount);
            const orgId = estimate.organization_id || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";

            if (reportPaymentType === 'contract') {
                if (amount > balanceDue + 0.01) {
                    toast.error(`O valor informado ($${amount.toFixed(2)}) não pode ser maior que o saldo restante do contrato ($${balanceDue.toFixed(2)}).`);
                    setIsSubmittingReportPayment(false);
                    return;
                }
            } else if (reportPaymentType === 'material') {
                if (amount > unpaidClientMaterials + 0.01) {
                    toast.error(`O valor informado ($${amount.toFixed(2)}) não pode ser maior que o saldo devedor das notinhas ($${unpaidClientMaterials.toFixed(2)}).`);
                    setIsSubmittingReportPayment(false);
                    return;
                }
            }
            
            let fileAttachmentNote = "";
            if (reportPaymentFile) {
                try {
                    const fileExt = reportPaymentFile.name.split('.').pop() || 'jpg';
                    const path = `${orgId}/client_payments/${Date.now()}_${reportPaymentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const { error: upErr } = await supabase.storage.from("images").upload(path, reportPaymentFile, { upsert: true });
                    if (!upErr) {
                        const { data: pubData } = supabase.storage.from("images").getPublicUrl(path);
                        if (pubData?.publicUrl) {
                            fileAttachmentNote = ` [Comprovante: ${pubData.publicUrl}]`;
                        }
                    } else {
                        // fallback to documents bucket
                        const { error: docErr } = await supabase.storage.from("documents").upload(path, reportPaymentFile, { upsert: true });
                        if (!docErr) {
                            const { data: pubData } = supabase.storage.from("documents").getPublicUrl(path);
                            if (pubData?.publicUrl) {
                                fileAttachmentNote = ` [Comprovante: ${pubData.publicUrl}]`;
                            }
                        }
                    }
                } catch (fErr) {
                    console.warn("Client payment proof upload note:", fErr);
                }
            }

            const noteHeader = reportPaymentType === 'material' ? '[PAGAMENTO DE MATERIAIS / NOTINHAS]' : '[PAGAMENTO DO CONTRATO]';
            const finalNote = `${noteHeader} ${reportPaymentNotes.trim()}${fileAttachmentNote}`.trim();

            await createClientPayment({
                organization_id: orgId,
                estimate_id: estimate.id,
                service_job_id: serviceJob?.id || null,
                lead_id: estimate.lead_id || null,
                customer_name: estimate.client_name || "Cliente",
                amount,
                method: reportPaymentMethod as any,
                payment_date: reportPaymentDate,
                note: finalNote,
                status: "draft", // Requires owner/partner validation
                receipt_status: "draft"
            });

            toast.success("Pagamento informado com sucesso! Aguardando validação dos proprietários da empresa.");
            setIsReportPaymentOpen(false);
            setReportPaymentAmount("");
            setReportPaymentNotes("");
            setReportPaymentFile(null);
            setReportPaymentFileUrl(null);
            loadPublicData(token!);
        } catch (err: any) {
            console.error("Error submitting client payment:", err);
            toast.error("Erro ao informar pagamento. Tente novamente.");
        } finally {
            setIsSubmittingReportPayment(false);
        }
    };

    // Hash sync
    useEffect(() => {
        const hash = location.hash.replace('#', '').toLowerCase();
        if (['overview', 'contract', 'extras', 'photos', 'materials', 'payments', 'documents'].includes(hash)) {
            setActiveTab(hash as any);
        }
    }, [location.hash]);

    useEffect(() => {
        if (token) {
            loadPublicData(token);
        }
    }, [token]);

    const loadPublicData = async (tk: string) => {
        setIsLoading(true);
        const data = await getEstimateByToken(tk);
        if (data) {
            setEstimate(data);
            if (data.client_name) {
                setSignerName(data.client_name);
                setExtraSignerName(data.client_name);
            }
            if (data.client_email) {
                setSignerEmail(data.client_email);
                setExtraSignerEmail(data.client_email);
            }
            if (data.status === 'Approved' || data.status === 'Paid') {
                setIsApproved(true);
            } else if (data.status === 'Rejected') {
                setIsDeclined(true);
            }

            try {
                const orgId = data.organization_id || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";
                getCompanySettings(orgId).then(c => setCompany(c)).catch(() => {});

                let job = await getServiceJobByEstimateId(data.id);
                if (!job && data.lead_id) {
                    try {
                        const { data: jobData } = await supabase.from('service_jobs').select('*').eq('lead_id', data.lead_id).maybeSingle();
                        if (jobData) job = jobData;
                    } catch (e) {}
                }
                setServiceJob(job);

                const [extrasList, allExpenses, mediaList, allPayments] = await Promise.all([
                    getServiceExtrasByJobOrEstimateId(job?.id, data.id, data.lead_id).catch(() => []),
                    getExpenses(orgId).catch(() => []),
                    job ? getJobMediaRecords(job.id).catch(() => []) : Promise.resolve([]),
                    getClientPayments(orgId).catch(() => [])
                ]);

                setExtras(extrasList || []);

                // Filter ONLY Client Materials (never company materials)
                const filteredClientMats = (allExpenses || []).filter(e => 
                    ((job && e.service_job_id === job.id) || (data.id && e.estimate_id === data.id) || (data.lead_id && (e as any).related_lead_id === data.lead_id)) && 
                    (e.bill_to_client === true || e.material_responsibility === 'client') &&
                    e.material_responsibility !== 'company'
                );
                setClientMaterials(filteredClientMats);

                // Pre-resolve signed URLs for material receipts
                const receiptUrlMap: Record<string, string> = {};
                await Promise.all(filteredClientMats.map(async (mat) => {
                    let path = mat.receipt_url || (mat as any).receipt_storage_path || (mat as any).storage_path;
                    if (!path && mat.receipt_files && mat.receipt_files.length > 0) {
                        path = mat.receipt_files[0].storage_path;
                    }
                    if (path) {
                        const resolved = await resolveSignedMediaUrl(path);
                        if (resolved) receiptUrlMap[mat.id] = resolved;
                    }
                }));
                setMaterialReceiptUrls(receiptUrlMap);

                // Filter ONLY Client-Visible Job Media (never admin-only media)
                const visibleMedia = (mediaList || []).filter(m => m.visible_to_client);
                setClientMedia(visibleMedia);

                // Filter Client Payments for this project
                setPayments((allPayments || []).filter(p => 
                    (job && p.service_job_id === job.id) || (data.id && p.estimate_id === data.id) || (data.lead_id && (p as any).lead_id === data.lead_id)
                ));

                // Resolve signed URLs for visible client job media
                const jobMediaUrlMap: Record<string, string> = {};
                await Promise.all(visibleMedia.map(async (m) => {
                    const resolved = await resolveSignedMediaUrl(m.storage_path);
                    if (resolved) jobMediaUrlMap[m.id] = resolved;
                }));
                setClientMediaUrls(jobMediaUrlMap);

                // Resolve extra media records
                if (extrasList && extrasList.length > 0) {
                    const exMap: Record<string, { record: ServiceExtraMediaRecord; url: string }[]> = {};
                    await Promise.all(extrasList.map(async (ex) => {
                        try {
                            const records = await getExtraMediaRecords(ex.id);
                            const resolvedList = await Promise.all(records.map(async (r) => {
                                const url = await resolveSignedMediaUrl(r.storage_path);
                                return { record: r, url: url || '' };
                            }));
                            exMap[ex.id] = resolvedList.filter(item => Boolean(item.url));
                        } catch (mErr) {
                            console.warn("Error fetching extra media for public view:", mErr);
                        }
                    }));
                    setExtraMediaMap(exMap);
                }
            } catch (err) {
                console.warn("Could not load linked job details in Client Portal:", err);
            }
        }
        setIsLoading(false);
    };

    // Financial Computations
    const originalContract = estimate?.total_amount || 0;

    const approvedExtras = useMemo(() => {
        return extras
            .filter(e => e.status === 'approved')
            .reduce((acc, e) => acc + (e.amount || 0), 0);
    }, [extras]);

    const pendingExtrasCount = useMemo(() => {
        return extras.filter(e => e.status === 'pending').length;
    }, [extras]);

    const currentContract = originalContract + approvedExtras;

    const totalClientMaterials = useMemo(() => {
        return clientMaterials.reduce((acc, m) => acc + (m.amount || 0), 0);
    }, [clientMaterials]);

    const paidClientMaterials = useMemo(() => {
        return clientMaterials
            .filter(m => (m as any).client_reimbursement_status === 'paid' || (m as any).payment_status === 'paid')
            .reduce((acc, m) => acc + (m.amount || 0), 0);
    }, [clientMaterials]);

    const unpaidClientMaterials = totalClientMaterials - paidClientMaterials;

    const totalResponsibility = currentContract + totalClientMaterials;

    const amountPaid = useMemo(() => {
        const fromPayments = (payments || [])
            .filter(p => p.status === 'received')
            .reduce((acc, p) => acc + (p.amount || 0), 0);
        return Math.max(fromPayments, estimate?.amount_paid || 0);
    }, [payments, estimate]);

    const balanceDue = totalResponsibility - amountPaid;

    // Timeline / Recent Activity Builder
    const recentActivities = useMemo(() => {
        const list: { id: string; type: 'estimate' | 'extra' | 'payment' | 'media' | 'document'; title: string; subtitle: string; date: string; icon: any; color: string }[] = [];

        if (estimate?.approved_at) {
            list.push({
                id: 'est-approved',
                type: 'estimate',
                title: 'Contract Approved & Signed',
                subtitle: `Approved by ${estimate.client_name || 'Client'} ($${originalContract.toLocaleString()})`,
                date: new Date(estimate.approved_at).toLocaleDateString(),
                icon: CheckCircle2,
                color: 'text-emerald-600 bg-emerald-50'
            });
        }

        extras.filter(e => e.status === 'approved').forEach(ex => {
            list.push({
                id: `extra-${ex.id}`,
                type: 'extra',
                title: 'Change Order Approved',
                subtitle: `${ex.description} (+$${ex.amount.toLocaleString()})`,
                date: ex.created_at ? new Date(ex.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                icon: Tag,
                color: 'text-purple-600 bg-purple-50'
            });
        });

        payments.filter(p => p.status === 'received').forEach(p => {
            list.push({
                id: `pay-${p.id}`,
                type: 'payment',
                title: 'Payment Received',
                subtitle: `$${p.amount.toLocaleString()} via ${p.method.toUpperCase()}`,
                date: p.payment_date ? new Date(p.payment_date).toLocaleDateString() : new Date(p.created_at).toLocaleDateString(),
                icon: DollarSign,
                color: 'text-blue-600 bg-blue-50'
            });
        });

        clientMedia.slice(0, 3).forEach(m => {
            list.push({
                id: `media-${m.id}`,
                type: 'media',
                title: 'Job Photo Uploaded',
                subtitle: m.caption || 'Project progress documentation photo',
                date: new Date(m.created_at).toLocaleDateString(),
                icon: Images,
                color: 'text-amber-600 bg-amber-50'
            });
        });

        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [estimate, extras, payments, clientMedia, originalContract]);

    const handleApproveContract = async () => {
        if (!estimate) return;

        setValidationError(null);
        if (!consentElectronic) {
            setValidationError("You must check the agreement to conduct this transaction electronically.");
            toast.error("Electronic consent required.");
            return;
        }
        if (!consentScope) {
            setValidationError("You must agree to the scope of work, pricing, and terms.");
            toast.error("Scope & terms agreement required.");
            return;
        }
        if (!signerName || !signerName.trim()) {
            setValidationError("Full Legal Name is required to sign.");
            toast.error("Full Legal Name required.");
            return;
        }
        if (!signerEmail || !signerEmail.includes("@")) {
            setValidationError("A valid Email Address is required.");
            toast.error("Valid email required.");
            return;
        }

        setIsApproving(true);
        try {
            const orgId = estimate.organization_id || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";
            let versionRecord = null;
            try {
                const { createDocumentVersionSnapshot } = await import("@/lib/esignatures");
                versionRecord = await createDocumentVersionSnapshot({
                    organization_id: orgId,
                    document_type: 'estimate',
                    document_id: estimate.id,
                    version_number: 1,
                    contractor_legal_name: company?.company_name || "H&A Construction LLC",
                    contractor_company_name: company?.company_name || "H&A Construction",
                    contractor_email: company?.email || "info@h-a-construction.com",
                    client_name: signerName.trim(),
                    client_email: signerEmail.trim(),
                    client_phone: estimate.client_phone || undefined,
                    project_address: estimate.client_address || undefined,
                    scope_text: estimate.notes || "Scope of Work as detailed in estimate items",
                    line_items_json: estimate.items || [],
                    subtotal: estimate.subtotal || 0,
                    tax_rate: (estimate.tax_rate || 0) / 100,
                    tax_amount: estimate.tax_amount || 0,
                    discount_amount: estimate.discount_amount || 0,
                    total_amount: estimate.total_amount || 0,
                    currency: "USD",
                    terms_text: estimate.terms || "Payment due upon receipt."
                });
            } catch (snapErr) {
                console.warn("Document version snapshot creation handled:", snapErr);
            }

            let sigPath = `${orgId}/documents/estimate/${estimate.id}/v1/signatures/client.png`;
            if (signatureDataUrl && versionRecord) {
                try {
                    const { uploadSignatureAsset } = await import("@/lib/esignatures");
                    sigPath = await uploadSignatureAsset(
                        orgId,
                        'estimate',
                        estimate.id,
                        versionRecord.id,
                        'client',
                        signatureDataUrl
                    );
                } catch (sigErr) {
                    console.warn("Signature asset upload handled:", sigErr);
                }
            }

            if (versionRecord) {
                try {
                    const { submitElectronicSignature } = await import("@/lib/esignatures");
                    await submitElectronicSignature({
                        organization_id: orgId,
                        document_type: 'estimate',
                        document_id: estimate.id,
                        document_version_id: versionRecord.id,
                        signer_role: 'client',
                        signer_name: signerName.trim(),
                        signer_email: signerEmail.trim(),
                        ip_address: "127.0.0.1",
                        user_agent: navigator.userAgent || "Mozilla/5.0 WebClient",
                        consent_text: "I agree to conduct this transaction electronically and use an electronic signature.",
                        signature_storage_path: sigPath,
                        document_hash: versionRecord.document_hash
                    });
                } catch (eSigErr) {
                    console.warn("Electronic signature submission handled:", eSigErr);
                }
            }

            const success = await approveEstimate(estimate.id, signerName.trim(), signerEmail.trim(), signatureDataUrl);
            if (success) {
                setIsApproved(true);
                setEstimate(prev => prev ? { ...prev, status: 'Approved', approved_at: new Date().toISOString() } : null);
                toast.success("Contract Approved & Digitally Signed!");
                try {
                    generateProfessionalPDF(estimate, company);
                    toast.success("PDF Commercial Contract downloaded.");
                } catch (pErr) {
                    console.warn("Could not generate PDF:", pErr);
                }
            } else {
                toast.error("Failed to approve estimate.");
            }
        } catch (err: any) {
            console.error("Contract approval error:", err);
            toast.error(err.message || "Failed to process contract approval.");
        } finally {
            setIsApproving(false);
        }
    };

    const handleApproveExtraSubmit = async () => {
        if (!extraToApprove || !token) return;

        setExtraValidationError(null);
        if (!extraConsentElectronic) {
            setExtraValidationError("You must consent to conduct this transaction electronically.");
            toast.error("Electronic consent required.");
            return;
        }
        if (!extraConsentScope) {
            setExtraValidationError("You must review and agree to the Change Order cost and revised total.");
            toast.error("Change Order terms agreement required.");
            return;
        }
        if (!extraSignerName.trim()) {
            setExtraValidationError("Full Legal Name is required to sign.");
            toast.error("Full Legal Name required.");
            return;
        }
        if (!extraSignerEmail.includes("@")) {
            setExtraValidationError("Valid Email Address is required.");
            toast.error("Valid email required.");
            return;
        }

        setIsApprovingExtra(true);
        try {
            const orgId = extraToApprove.organization_id || estimate?.organization_id || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";
            let versionRecord = null;
            try {
                const { createDocumentVersionSnapshot } = await import("@/lib/esignatures");
                versionRecord = await createDocumentVersionSnapshot({
                    organization_id: orgId,
                    document_type: 'change_order',
                    document_id: extraToApprove.id,
                    version_number: 1,
                    contractor_legal_name: company?.company_name || "H&A Construction LLC",
                    contractor_company_name: company?.company_name || "H&A Construction",
                    contractor_email: company?.email || "info@h-a-construction.com",
                    client_name: extraSignerName.trim(),
                    client_email: extraSignerEmail.trim(),
                    scope_text: extraToApprove.description || "Change Order modification",
                    line_items_json: [{ description: extraToApprove.description, amount: extraToApprove.amount }],
                    previous_contract_price: extraToApprove.previous_contract_price || currentContract,
                    change_amount: extraToApprove.amount || 0,
                    subtotal: extraToApprove.amount || 0,
                    tax_rate: 0,
                    tax_amount: 0,
                    discount_amount: 0,
                    total_amount: extraToApprove.amount || 0,
                    revised_total: extraToApprove.revised_contract_price || (currentContract + extraToApprove.amount),
                    schedule_impact: extraToApprove.schedule_impact || "None",
                    currency: "USD",
                    terms_text: "Change order terms approved electronically by client."
                });
            } catch (snapErr) {
                console.warn("Change order version snapshot creation handled:", snapErr);
            }

            let sigPath = `${orgId}/documents/change_order/${extraToApprove.id}/v1/signatures/client.png`;
            if (extraSignatureDataUrl && versionRecord) {
                try {
                    const { uploadSignatureAsset } = await import("@/lib/esignatures");
                    sigPath = await uploadSignatureAsset(
                        orgId,
                        'change_order',
                        extraToApprove.id,
                        versionRecord.id,
                        'client',
                        extraSignatureDataUrl
                    );
                } catch (sigErr) {
                    console.warn("Change order signature asset upload handled:", sigErr);
                }
            }

            if (versionRecord) {
                try {
                    const { submitElectronicSignature } = await import("@/lib/esignatures");
                    await submitElectronicSignature({
                        organization_id: orgId,
                        document_type: 'change_order',
                        document_id: extraToApprove.id,
                        document_version_id: versionRecord.id,
                        signer_role: 'client',
                        signer_name: extraSignerName.trim(),
                        signer_email: extraSignerEmail.trim(),
                        ip_address: "127.0.0.1",
                        user_agent: navigator.userAgent || "Mozilla/5.0 WebClient",
                        consent_text: "I agree to conduct this Change Order transaction electronically.",
                        signature_storage_path: sigPath,
                        document_hash: versionRecord.document_hash
                    });
                } catch (eSigErr) {
                    console.warn("Change order electronic signature submission handled:", eSigErr);
                }
            }

            const success = await respondPublicServiceExtra(extraToApprove.public_token || extraToApprove.id, 'approved');
            if (success) {
                const updated = { ...extraToApprove, status: 'approved' as const };
                setExtras(prev => prev.map(e => e.id === extraToApprove.id ? updated : e));
                toast.success("Change Order Approved successfully!");
                setExtraToApprove(null);

                try {
                    generateChangeOrderPDF(updated, estimate, company, {
                        signerName: extraSignerName.trim(),
                        signerEmail: extraSignerEmail.trim(),
                        signatureDataUrl: extraSignatureDataUrl,
                        signedAt: new Date().toLocaleString()
                    });
                    toast.success("Change Order Receipt downloaded.");
                } catch (pdfErr) {
                    console.warn("Could not generate Change Order PDF:", pdfErr);
                }
            } else {
                toast.error("Failed to approve Change Order.");
            }
        } catch (err: any) {
            console.error("Change order approval error:", err);
            toast.error(err.message || "Failed to process Change Order approval.");
        } finally {
            setIsApprovingExtra(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                    <p className="text-sm font-semibold text-gray-600">Loading Secure Client Project Portal...</p>
                </div>
            </div>
        );
    }

    if (!estimate) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-gray-100">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900">Project Not Found</h1>
                    <p className="text-gray-500 mt-2 text-sm">The project link might be invalid or expired.</p>
                </div>
            </div>
        );
    }

    const filteredMedia = clientMedia.filter(m => {
        if (selectedCategory === 'all') return true;
        return m.category === selectedCategory;
    });

    return (
        <div className="min-h-screen bg-gray-50/70 pb-24">
            {/* BRAND HEADER & CLIENT PROJECT BAR */}
            <header className="bg-[#0b2a4a] text-white shadow-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        {/* Company & Project Meta */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                {company?.logo_url ? (
                                    <img src={company.logo_url} alt="Company Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
                                ) : (
                                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                        H&amp;A
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">{company?.company_name || "H&A Construction LLC"}</h1>
                                    <p className="text-xs text-blue-200/80 uppercase tracking-widest font-semibold">Client Project Portal</p>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-100">
                                <span className="font-bold text-white text-sm sm:text-base">{estimate.client_name}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1 text-blue-200"><MapPin className="h-3.5 w-3.5 text-blue-400" /> {estimate.client_address || "Project Site"}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1 text-blue-200"><Tag className="h-3.5 w-3.5 text-blue-400" /> {estimate.title || "Construction Service"}</span>
                            </div>
                        </div>

                        {/* Project Status Pill & Fast Action */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <Badge className={cn("px-3.5 py-1 text-xs font-bold uppercase rounded-full shadow-sm", 
                                serviceJob?.status === 'completed' ? "bg-emerald-500 text-white" :
                                isApproved ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                            )}>
                                Status: {serviceJob?.status ? serviceJob.status.replace('_', ' ') : estimate.status}
                            </Badge>

                            <Button 
                                onClick={() => generateProfessionalPDF(estimate, company)} 
                                size="sm"
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs h-9 gap-1.5 rounded-xl"
                            >
                                <Download className="h-3.5 w-3.5" /> Download Contract PDF
                            </Button>
                        </div>
                    </div>

                    {/* FINANCIAL KPI RIBBON */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-6 mt-6 border-t border-white/10 text-xs">
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">Original Contract</span>
                            <span className="text-base font-bold text-white">${originalContract.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Approved Extras</span>
                            <span className="text-base font-bold text-purple-300">+${approvedExtras.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Current Contract</span>
                            <span className="text-base font-black text-white">${currentContract.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Client Materials</span>
                            <span className="text-base font-bold text-amber-300">+${totalClientMaterials.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Amount Paid</span>
                            <span className="text-base font-bold text-emerald-400">${amountPaid.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/10 p-2.5 rounded-xl border border-blue-400/30">
                            <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Balance Due</span>
                            <span className="text-base font-black text-blue-200">${balanceDue > 0 ? `$${balanceDue.toLocaleString()}` : "$0"}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* MOBILE-FIRST NAVIGATION TABS */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
                        {[
                            { id: 'overview', label: 'Overview', icon: Eye },
                            { id: 'contract', label: 'Contract', icon: FileText },
                            { id: 'extras', label: 'Change Orders', icon: Tag, count: pendingExtrasCount > 0 ? pendingExtrasCount : extras.length },
                            { id: 'photos', label: 'Photos & Videos', icon: Images, count: clientMedia.length },
                            { id: 'materials', label: 'Materials', icon: Receipt, count: clientMaterials.length },
                            { id: 'payments', label: 'Payments', icon: DollarSign, count: payments.length },
                            { id: 'documents', label: 'Documents', icon: Folder }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        window.location.hash = tab.id;
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0",
                                        isActive
                                            ? "bg-[#0b2a4a] text-white shadow-md shadow-blue-900/10"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive ? "text-blue-300" : "text-gray-400")} />
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                                            isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                                        )}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-in fade-in">
                        {/* Financial Dashboard Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Contract Value</span>
                                <p className="text-3xl font-black text-gray-900">${currentContract.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Original Contract (${originalContract.toLocaleString()}) + Approved Extras (+${approvedExtras.toLocaleString()})</p>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount Paid to Date</span>
                                <p className="text-3xl font-black text-emerald-600">${amountPaid.toLocaleString()}</p>
                                <p className="text-xs text-emerald-700/80 font-medium">Verified customer payments received</p>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remaining Balance Due</span>
                                <p className="text-3xl font-black text-blue-900">${balanceDue > 0 ? `$${balanceDue.toLocaleString()}` : "$0"}</p>
                                <p className="text-xs text-gray-500">Includes Contract Balance + Outstanding Materials</p>
                            </div>
                        </div>

                        {/* Recent Activity Timeline */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600" /> Recent Project Activity &amp; Updates
                            </h2>

                            {recentActivities.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No project activity logged yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {recentActivities.map((act) => {
                                        const Icon = act.icon;
                                        return (
                                            <div key={act.id} className="flex items-start gap-4 p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                                                <div className={cn("p-2.5 rounded-xl shrink-0", act.color)}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900">{act.title}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{act.subtitle}</p>
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium shrink-0">{act.date}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. CONTRACT TAB */}
                {activeTab === 'contract' && (
                    <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden space-y-8 p-6 sm:p-12 animate-in fade-in">
                        {/* Scope & Line Items */}
                        <div className="space-y-6">
                            <div className="border-b border-gray-100 pb-4">
                                <h2 className="text-xl font-bold text-gray-900">Commercial Scope of Work</h2>
                                <p className="text-xs text-gray-500 mt-1">Review line items, specifications, and contract terms below.</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                                            <th className="py-3">Item</th>
                                            <th className="py-3">Description</th>
                                            <th className="py-3 text-center">Qty</th>
                                            <th className="py-3 text-right">Unit Price</th>
                                            <th className="py-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 font-medium">
                                        {(estimate.items || []).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="py-4 font-bold text-gray-400">{idx + 1}</td>
                                                <td className="py-4 text-gray-900">{item.description}</td>
                                                <td className="py-4 text-center">{item.quantity}</td>
                                                <td className="py-4 text-right">${item.unit_price.toFixed(2)}</td>
                                                <td className="py-4 text-right font-bold text-gray-900">${(item.total_price || (item.quantity * item.unit_price)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Financial Totals */}
                            <div className="flex flex-col items-end gap-2 pt-6 border-t border-gray-100 text-sm">
                                <div className="flex justify-between w-full max-w-xs text-gray-500">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-gray-900">${estimate.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between w-full max-w-xs text-gray-500">
                                    <span>Tax ({estimate.tax_rate}%)</span>
                                    <span className="font-bold text-gray-900">${estimate.tax_amount.toLocaleString()}</span>
                                </div>
                                {estimate.discount_amount > 0 && (
                                    <div className="flex justify-between w-full max-w-xs text-red-500">
                                        <span>Discount</span>
                                        <span className="font-bold">-${estimate.discount_amount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between w-full max-w-xs text-xl font-black text-gray-900 pt-3 border-t border-gray-200">
                                    <span>Total Contract Amount</span>
                                    <span className="text-blue-600">${estimate.total_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Terms &amp; Commercial Conditions</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">{estimate.terms || "Payment due upon receipt. Commercial agreement subject to final signoff."}</p>
                        </div>

                        {/* E-Signature Form or Signed Proof */}
                        {!isApproved ? (
                            <div className="p-6 sm:p-8 bg-blue-50/60 rounded-3xl border border-blue-100 space-y-6">
                                <div className="border-b border-blue-100 pb-3">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-blue-600" /> Sign &amp; Approve Estimate
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Please review the terms and complete electronic signature to authorize contract execution.</p>
                                </div>

                                {validationError && (
                                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                        <span>{validationError}</span>
                                    </div>
                                )}

                                <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 text-xs">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={consentElectronic} onChange={e => setConsentElectronic(e.target.checked)} className="mt-1 h-4 w-4 rounded text-blue-600" />
                                        <span>I agree to conduct this transaction electronically and use an electronic signature (UETA / E-SIGN Act Compliance).</span>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={consentScope} onChange={e => setConsentScope(e.target.checked)} className="mt-1 h-4 w-4 rounded text-blue-600" />
                                        <span>I have read, understood, and agree to the scope of work and contract total of ${estimate.total_amount.toLocaleString()}.</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Full Legal Name *</label>
                                        <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Full Legal Name" className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Email Address *</label>
                                        <input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="Email Address" className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Draw Signature *</label>
                                    <SignaturePad onSignatureChange={dataUrl => setSignatureDataUrl(dataUrl)} />
                                </div>

                                <Button onClick={handleApproveContract} disabled={isApproving} className="w-full bg-[#0b2a4a] hover:bg-[#081e35] text-white h-12 rounded-xl font-bold shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2">
                                    {isApproving ? <Loader2 className="h-5 w-5 animate-spin" /> : <PenTool className="h-4 w-4 text-blue-300" />}
                                    Sign &amp; Approve Commercial Contract (${estimate.total_amount.toLocaleString()})
                                </Button>
                            </div>
                        ) : (
                            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-bold text-base">Contract Digitally Signed &amp; Approved</p>
                                        <p className="text-emerald-800/80 text-xs mt-0.5">Approved on {new Date(estimate.approved_at || Date.now()).toLocaleDateString()}. Thank you for choosing {company?.company_name || "H&A Construction"}!</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => generateProfessionalPDF(estimate, company)} className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-bold text-xs flex items-center gap-2 shadow-sm shrink-0">
                                    <Download className="h-4 w-4 text-emerald-600" /> Download Contract PDF
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. CHANGE ORDERS / EXTRAS TAB */}
                {activeTab === 'extras' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-purple-600" /> Change Orders &amp; Service Extras
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Scope modifications and customer upgrades for this project.</p>
                                </div>
                            </div>

                            {extras.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No Change Orders added for this project.</p>
                            ) : (
                                <div className="space-y-4">
                                    {extras.map((extra) => {
                                        const mediaItems = extraMediaMap[extra.id] || [];
                                        const cleanDescText = cleanReasonForDisplay(extra.description);
                                        const cleanReasonText = cleanReasonForDisplay(extra.reason);

                                        return (
                                            <div key={extra.id} className="p-6 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase", 
                                                                extra.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                                                extra.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                                            )}>
                                                                {extra.status}
                                                            </Badge>
                                                            <span className="text-xs font-mono text-gray-400">CO-{extra.id.slice(0, 8).toUpperCase()}</span>
                                                        </div>
                                                        <h3 className="font-bold text-gray-900 text-base">{cleanDescText}</h3>
                                                        {cleanReasonText && <p className="text-xs text-gray-600">Reason: {cleanReasonText}</p>}
                                                        {extra.schedule_impact && <p className="text-xs text-purple-700 font-medium">Schedule Impact: {extra.schedule_impact}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-2xl font-black text-purple-900">+${extra.amount.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Extra Attached Photos/Videos */}
                                                {mediaItems.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-100">
                                                        {mediaItems.map((item, idx) => (
                                                            <div key={idx} className="relative aspect-square w-20 rounded-xl overflow-hidden border border-purple-200 cursor-pointer" onClick={() => setSelectedMediaUrl(item.url)}>
                                                                <img src={item.url} alt="Extra evidence photo" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-purple-100/60">
                                                    {extra.status === 'pending' ? (
                                                        <Button onClick={() => setExtraToApprove(extra)} size="sm" className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5">
                                                            <PenTool className="h-3.5 w-3.5 text-purple-300" /> Sign &amp; Approve Change Order
                                                        </Button>
                                                    ) : extra.status === 'approved' ? (
                                                        <Button onClick={() => generateChangeOrderPDF(extra, estimate, company, { signerName: estimate.client_name, signerEmail: estimate.client_email })} size="sm" variant="outline" className="bg-white border-purple-200 text-purple-900 font-bold text-xs rounded-xl gap-1.5 shadow-sm">
                                                            <Download className="h-3.5 w-3.5 text-purple-600" /> Download Change Order Receipt PDF
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. PHOTOS & VIDEOS TAB */}
                {activeTab === 'photos' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Images className="h-5 w-5 text-amber-600" /> Project Photos &amp; Video Documentation
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Client-visible progress photos and job site documentation.</p>
                                </div>

                                <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs">
                                    {(['all', 'progress', 'completed', 'document'] as const).map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-3 py-1.5 rounded-lg font-bold capitalize transition-all", selectedCategory === cat ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900")}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {filteredMedia.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No client-visible photos uploaded yet for this job.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredMedia.map((m) => {
                                        const url = clientMediaUrls[m.id];
                                        const isVideo = m.storage_path.endsWith('.mp4') || m.storage_path.endsWith('.mov');
                                        return (
                                            <div key={m.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm cursor-pointer" onClick={() => url && setSelectedMediaUrl(url)}>
                                                {isVideo ? (
                                                    <video src={url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={url} alt={m.caption || "Job documentation"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                                                    <p className="text-xs font-bold line-clamp-1">{m.caption || "Job Documentation"}</p>
                                                    <p className="text-[10px] text-gray-300">{new Date(m.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. MATERIALS TAB */}
                {activeTab === 'materials' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Receipt className="h-5 w-5 text-amber-600" /> Client Materials &amp; Purchases (Notinhas)
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Purchases billed directly to client or requested for reimbursement with receipt proof attached.</p>
                                </div>
                                <Button onClick={() => { setReportPaymentType('material'); setReportPaymentAmount(unpaidClientMaterials > 0 ? unpaidClientMaterials.toFixed(2) : ''); setIsReportPaymentOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 shrink-0">
                                    <Plus className="h-4 w-4" /> Informar Pagamento das Notinhas
                                </Button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Total Client Materials</span>
                                    <p className="text-2xl font-black text-amber-900">${totalClientMaterials.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Paid / Reimbursed</span>
                                    <p className="text-2xl font-black text-emerald-900">${paidClientMaterials.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Outstanding Balance</span>
                                    <p className="text-2xl font-black text-blue-900">${unpaidClientMaterials.toLocaleString()}</p>
                                </div>
                            </div>

                            {clientMaterials.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No client-billed materials logged for this project.</p>
                            ) : (
                                <div className="space-y-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-bold">
                                                    <th className="py-3">Vendor</th>
                                                    <th className="py-3">Description</th>
                                                    <th className="py-3">Date</th>
                                                    <th className="py-3 text-right">Amount</th>
                                                    <th className="py-3 text-center">Receipt Photo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 font-medium">
                                                {clientMaterials.map((mat) => {
                                                    const receiptUrl = materialReceiptUrls[mat.id] || mat.receipt_url;
                                                    const hasReceipt = Boolean(
                                                        receiptUrl || 
                                                        (mat as any).receipt_storage_path || 
                                                        (mat as any).storage_path || 
                                                        (mat.receipt_files && mat.receipt_files.length > 0)
                                                    );
                                                    
                                                    return (
                                                        <tr key={mat.id} className="hover:bg-gray-50/50">
                                                            <td className="py-3.5 font-bold text-gray-900">{mat.vendor_name || mat.vendor || "Supplier"}</td>
                                                            <td className="py-3.5 text-gray-600">{mat.description || mat.notes}</td>
                                                            <td className="py-3.5 text-gray-400">{new Date(mat.expense_date || mat.receipt_date || mat.created_at).toLocaleDateString()}</td>
                                                            <td className="py-3.5 text-right font-bold text-gray-900">${mat.amount.toFixed(2)}</td>
                                                            <td className="py-3.5 text-center">
                                                                {hasReceipt ? (
                                                                    <button onClick={async () => {
                                                                        let url = materialReceiptUrls[mat.id] || mat.receipt_url;
                                                                        if (!url && (mat as any).receipt_storage_path) {
                                                                            url = await resolveSignedMediaUrl((mat as any).receipt_storage_path);
                                                                        } else if (!url && (mat as any).storage_path) {
                                                                            url = await resolveSignedMediaUrl((mat as any).storage_path);
                                                                        } else if (!url && mat.receipt_files && mat.receipt_files.length > 0) {
                                                                            url = await resolveSignedMediaUrl(mat.receipt_files[0].storage_path);
                                                                        }
                                                                        if (url) setSelectedReceiptUrl(url);
                                                                    }} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-colors mx-auto text-[11px]">
                                                                        <Receipt className="h-3.5 w-3.5 text-amber-600" /> Ver Comprovante
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-gray-400 italic text-[11px]">Sem foto</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. PAYMENTS TAB */}
                {activeTab === 'payments' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-emerald-600" /> Customer Payment History
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Verified payments received &amp; client-reported payments for contract and materials.</p>
                                </div>
                                <Button onClick={() => setIsReportPaymentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 shrink-0">
                                    <Plus className="h-4 w-4" /> Informar Pagamento
                                </Button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1">
                                    <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Total Amount Paid</span>
                                    <p className="text-3xl font-black text-emerald-900">${amountPaid.toLocaleString()}</p>
                                </div>
                                <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1">
                                    <span className="text-xs font-bold uppercase text-blue-800 tracking-wider">Remaining Balance</span>
                                    <p className="text-3xl font-black text-blue-900">${balanceDue > 0 ? `$${balanceDue.toLocaleString()}` : "$0"}</p>
                                </div>
                            </div>

                            {payments.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No individual payment receipts logged yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-bold">
                                                    <th className="py-3">Date</th>
                                                    <th className="py-3">Method</th>
                                                    <th className="py-3">Reference / Note</th>
                                                    <th className="py-3 text-right">Amount</th>
                                                    <th className="py-3 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 font-medium">
                                                {payments.map((p) => {
                                                    const isCancelled = p.status === 'cancelled';
                                                    const isPending = p.status === 'draft' || p.status === 'pending_validation' as any;
                                                    const isReceived = p.status === 'received';
                                                    
                                                    return (
                                                        <tr key={p.id} className="hover:bg-gray-50/50">
                                                            <td className="py-3.5 font-bold text-gray-900">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
                                                            <td className="py-3.5 uppercase text-gray-700">{p.method}</td>
                                                            <td className="py-3.5 text-gray-500 max-w-xs truncate">{p.note || "Verified Payment"}</td>
                                                            <td className="py-3.5 text-right font-black text-emerald-700">${p.amount.toFixed(2)}</td>
                                                            <td className="py-3.5 text-center">
                                                                {isReceived && (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Validado (Recebido)</Badge>
                                                                )}
                                                                {isPending && (
                                                                    <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">Aguardando Validação</Badge>
                                                                )}
                                                                {isCancelled && (
                                                                    <Badge className="bg-red-100 text-red-800 text-[10px] font-bold uppercase">Cancelado / Rejeitado</Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Cancellation Details Box if any cancelled payment exists */}
                                    {payments.filter(p => p.status === 'cancelled').map(p => (
                                        <div key={`cancelled-${p.id}`} className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-red-600" />
                                                <span className="font-bold text-sm text-red-900">Pagamento de ${p.amount.toFixed(2)} Cancelado / Rejeitado</span>
                                            </div>
                                            <p className="text-red-800">
                                                <span className="font-bold">Motivo do Cancelamento:</span> {(p as any).cancellation_reason || p.note?.replace('[CANCELLED]', '') || 'Depósito não verificado na conta bancária da empresa.'}
                                            </p>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-red-200/80">
                                                <span className="font-bold text-red-950">Saldo Devedor Atual: ${balanceDue.toLocaleString()}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => generatePaymentCancellationPDF(
                                                        p, 
                                                        estimate, 
                                                        company, 
                                                        (p as any).cancellation_reason || 'Depósito não verificado na conta bancária', 
                                                        (p as any).validated_by || 'Proprietário da Empresa'
                                                    )}
                                                    className="bg-white border-red-300 text-red-700 hover:bg-red-100 font-bold text-xs h-8 gap-1.5 shadow-sm shrink-0"
                                                >
                                                    <Download className="h-3.5 w-3.5" /> Baixar Recibo de Cancelamento (PDF)
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 7. DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Folder className="h-5 w-5 text-blue-600" /> Project Document Library
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Commercial contracts, signed proof receipts, and change order documents.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Contract Document */}
                                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">Commercial Contract &amp; Scope</p>
                                            <p className="text-xs text-gray-500">{isApproved ? "Signed Contract" : "Unsigned Estimate"}</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => generateProfessionalPDF(estimate, company)} size="sm" variant="outline" className="bg-white font-bold text-xs gap-1.5 rounded-xl">
                                        <Download className="h-3.5 w-3.5 text-blue-600" /> Download
                                    </Button>
                                </div>

                                {/* Approved Change Orders */}
                                {extras.filter(e => e.status === 'approved').map(ex => (
                                    <div key={ex.id} className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-purple-100 text-purple-800 rounded-xl">
                                                <Tag className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">Change Order Receipt CO-{ex.id.slice(0, 8).toUpperCase()}</p>
                                                <p className="text-xs text-purple-700 font-medium">+$${ex.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <Button onClick={() => generateChangeOrderPDF(ex, estimate, company, { signerName: estimate.client_name, signerEmail: estimate.client_email })} size="sm" variant="outline" className="bg-white text-purple-900 font-bold text-xs gap-1.5 rounded-xl border-purple-200">
                                            <Download className="h-3.5 w-3.5 text-purple-600" /> Receipt PDF
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* CHANGE ORDER E-SIGNATURE MODAL OVERLAY */}
            {extraToApprove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <PenTool className="h-5 w-5 text-purple-600" /> Sign &amp; Approve Change Order
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Reference: CO-{extraToApprove.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <button onClick={() => setExtraToApprove(null)} className="p-2 text-gray-400 hover:text-gray-700 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scope & Financial summary */}
                        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                            <h4 className="font-bold text-purple-950 text-base">{cleanReasonForDisplay(extraToApprove.description)}</h4>
                            {extraToApprove.reason && cleanReasonForDisplay(extraToApprove.reason) && (
                                <p className="text-xs text-purple-800">Reason: {cleanReasonForDisplay(extraToApprove.reason)}</p>
                            )}
                            {extraToApprove.schedule_impact && <p className="text-xs text-purple-700 font-medium">Schedule Impact: {extraToApprove.schedule_impact}</p>}
                            
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-200 text-center text-xs">
                                <div>
                                    <span className="text-[10px] uppercase text-purple-600 font-bold">Original Contract</span>
                                    <p className="font-bold text-gray-900">${(estimate.total_amount || 0).toLocaleString()}</p>
                                </div>
                                <div className="border-x border-purple-200">
                                    <span className="text-[10px] uppercase text-purple-600 font-bold">Extra Addition</span>
                                    <p className="font-bold text-purple-700">+${extraToApprove.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-purple-600 font-bold">Revised Total</span>
                                    <p className="font-black text-blue-900">${((estimate.total_amount || 0) + extraToApprove.amount).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {extraValidationError && (
                            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                <span>{extraValidationError}</span>
                            </div>
                        )}

                        {/* Step 1: Legal Consents */}
                        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Step 1 — Consent &amp; Scope Agreement</h4>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={extraConsentElectronic} onChange={(e) => setExtraConsentElectronic(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" />
                                <span className="text-xs text-gray-700 font-medium leading-relaxed">
                                    I agree to conduct this transaction electronically and use an electronic signature (UETA / E-SIGN Act Compliance).
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={extraConsentScope} onChange={(e) => setExtraConsentScope(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" />
                                <span className="text-xs text-gray-700 font-medium leading-relaxed">
                                    I have read and agree to the Change Order cost (+${extraToApprove.amount.toLocaleString()}) and revised contract total of ${((estimate.total_amount || 0) + extraToApprove.amount).toLocaleString()}.
                                </span>
                            </label>
                        </div>

                        {/* Step 2: Signer Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Full Legal Name *</label>
                                <input type="text" value={extraSignerName} onChange={(e) => setExtraSignerName(e.target.value)} placeholder="Full Legal Name" className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Email Address *</label>
                                <input type="email" value={extraSignerEmail} onChange={(e) => setExtraSignerEmail(e.target.value)} placeholder="Email Address" className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500" />
                            </div>
                        </div>

                        {/* Step 3: Draw Signature */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700">Draw Signature *</label>
                            <SignaturePad onSignatureChange={(dataUrl) => setExtraSignatureDataUrl(dataUrl)} />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setExtraToApprove(null)} disabled={isApprovingExtra} className="rounded-xl h-11 px-5 text-xs font-semibold">
                                Cancel
                            </Button>
                            <Button onClick={handleApproveExtraSubmit} disabled={isApprovingExtra} className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl h-11 px-6 text-xs font-bold shadow-lg shadow-purple-900/10 flex items-center gap-2">
                                {isApprovingExtra ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4 text-purple-300" />}
                                Sign &amp; Approve Change Order (+${extraToApprove.amount.toLocaleString()})
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN MEDIA ZOOM LIGHTBOX */}
            {selectedMediaUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedMediaUrl(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-black" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedMediaUrl(null)} className="absolute top-3 right-3 z-10 bg-black/70 text-white rounded-full p-2 hover:bg-black transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                        {selectedMediaUrl.includes('.mp4') || selectedMediaUrl.includes('.mov') ? (
                            <video src={selectedMediaUrl} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl" />
                        ) : (
                            <img src={selectedMediaUrl} alt="Enlarged view" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
                        )}
                    </div>
                </div>
            )}

            {/* SECURE RECEIPT MODAL */}
            {selectedReceiptUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedReceiptUrl(null)}>
                    <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-amber-600" /> Material Purchase Receipt
                            </h3>
                            <button onClick={() => setSelectedReceiptUrl(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <img src={selectedReceiptUrl} alt="Material Receipt" className="max-w-full max-h-[70vh] object-contain rounded-xl mx-auto" />
                    </div>
                </div>
            )}

            {/* CLIENT REPORT PAYMENT MODAL */}
            {isReportPaymentOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-base text-[#0b2a4a] flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                Informar Pagamento Efetuado
                            </h3>
                            <button onClick={() => setIsReportPaymentOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Tipo de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setReportPaymentType('contract')}
                                        className={cn("p-2.5 rounded-xl border text-center font-bold transition-all", 
                                            reportPaymentType === 'contract' ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-gray-50 border-gray-200 text-gray-600"
                                        )}
                                    >
                                        Saldo do Contrato
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReportPaymentType('material')}
                                        className={cn("p-2.5 rounded-xl border text-center font-bold transition-all", 
                                            reportPaymentType === 'material' ? "bg-amber-50 border-amber-500 text-amber-900" : "bg-gray-50 border-gray-200 text-gray-600"
                                        )}
                                    >
                                        Notinhas / Materiais
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">Valor Pago ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={reportPaymentAmount}
                                        onChange={e => setReportPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-emerald-700"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-gray-700 block mb-1">Data do Pagamento</label>
                                    <input
                                        type="date"
                                        value={reportPaymentDate}
                                        onChange={e => setReportPaymentDate(e.target.value)}
                                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Forma de Pagamento</label>
                                <select
                                    value={reportPaymentMethod}
                                    onChange={e => setReportPaymentMethod(e.target.value as any)}
                                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                                >
                                    <option value="zelle">Zelle</option>
                                    <option value="check">Cheque (Check)</option>
                                    <option value="cash">Dinheiro (Cash)</option>
                                    <option value="venmo">Venmo</option>
                                    <option value="card">Cartão</option>
                                    <option value="bank_transfer">Transferência Bancária</option>
                                </select>
                            </div>

                            {/* Proof Photo Upload */}
                            <div className="pt-2 border-t border-gray-100 space-y-2">
                                <label className="font-bold text-gray-700 block">Anexar Comprovante / Foto</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 text-[11px] hover:bg-blue-100 text-center">
                                        📷 Tirar Foto (Câmera)
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setReportPaymentFile(file);
                                                    setReportPaymentFileUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                    <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 text-[11px] hover:bg-gray-100 text-center">
                                        🖼️ Carregar Foto
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setReportPaymentFile(file);
                                                    setReportPaymentFileUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                {reportPaymentFileUrl && (
                                    <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 mt-2">
                                        <img src={reportPaymentFileUrl} alt="Comprovante" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="font-bold text-gray-700 block mb-1">Observações / Referência</label>
                                <textarea
                                    rows={2}
                                    value={reportPaymentNotes}
                                    onChange={e => setReportPaymentNotes(e.target.value)}
                                    placeholder="Ex: Transferência Zelle realizada via aplicativo bancário."
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <Button variant="outline" size="sm" onClick={() => setIsReportPaymentOpen(false)}>Cancelar</Button>
                            <Button
                                onClick={handleReportPaymentSubmit}
                                disabled={isSubmittingReportPayment || !reportPaymentAmount}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            >
                                {isSubmittingReportPayment ? "Enviando..." : "Confirmar Envio"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicView;
