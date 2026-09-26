import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Clock, Save, FileText, User, Mail, Phone, MapPin, CheckCircle2,
  MoreHorizontal, Images, Wrench, UserCheck, DollarSign, Plus, Download, Copy,
  Printer, ShieldCheck, PenTool, Calendar, AlertCircle, Sparkles, ExternalLink,
  ChevronRight, Eye, EyeOff, Globe, Tag, CreditCard, Receipt, FileCheck, Building2,
  Pencil, Trash2, Info, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";
import { getEstimateById, Estimate } from "@/lib/estimates";
import { getServiceExtrasByJobId, createServiceExtra, ServiceExtra, extractMediaFromText } from "@/lib/service-extras";
import { getJobMediaRecords, uploadJobMediaRecord, updateJobMediaVisibility, deleteJobMediaRecord, resolveSignedMediaUrl, uploadExtraMediaRecord, ServiceJobMediaRecord } from "@/lib/job-media";
import { getExpenses, createExpense, Expense, updateExpense, deleteExpense } from "@/lib/expenses";
import { getClientPayments, createClientPayment, updateClientPayment, deleteClientPayment, ClientPayment } from "@/lib/client-payments";
import { getCompanySettings, CompanySettings } from "@/lib/company-settings";
import { getOrganizationPartners, OrganizationPartner } from "@/lib/partners";
import RegisterPaymentModal from "@/components/admin/estimates/RegisterPaymentModal";
import CountersignModal from "@/components/admin/estimates/CountersignModal";
import { generateProfessionalPDF } from "@/lib/pdf-generator";

type WorkspaceTab =
  | "overview"
  | "contract"
  | "schedule"
  | "payments"
  | "extras"
  | "media"
  | "materials"
  | "reimbursements"
  | "documents"
  | "history";

export default function JobWorkspace() {
  const params = useParams<{ jobId?: string; id?: string }>();
  const jobId = params.jobId || params.id;
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useUser();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Core Data Entities
  const [job, setJob] = useState<any | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [lead, setLead] = useState<any | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [extras, setExtras] = useState<ServiceExtra[]>([]);
  const [media, setMedia] = useState<ServiceJobMediaRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [partners, setPartners] = useState<OrganizationPartner[]>([]);

  // Modals & Forms
  const [isRegisterPaymentOpen, setIsRegisterPaymentOpen] = useState(false);
  const [isCountersignOpen, setIsCountersignOpen] = useState(false);
  const [isAddExtraOpen, setIsAddExtraOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [isPartnerSettlementOpen, setIsPartnerSettlementOpen] = useState(false);
  const [isCompanyMaterialsModalOpen, setIsCompanyMaterialsModalOpen] = useState(false);
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);

  const [settlementForm, setSettlementForm] = useState({
    payerName: "",
    receiverName: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "zelle",
    notes: ""
  });
  const [settlementFile, setSettlementFile] = useState<File | null>(null);
  const [settlementFileUrl, setSettlementFileUrl] = useState<string | null>(null);

  // Action Loading States
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingExtra, setIsSavingExtra] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Extra Form State
  const [extraForm, setExtraForm] = useState({
    description: "",
    reason: "",
    amount: "",
    scheduleImpact: "0 days"
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    vendor: "",
    amount: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    paidByName: user?.name || "Hugo Manager",
    paymentSource: "owner_personal",
    reimbursableToOwner: false,
    billToClient: true
  });

  // Media Form State
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [selectedMediaFiles, setSelectedMediaFiles] = useState<File[]>([]);
  const [mediaFileUrl, setMediaFileUrl] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaVisibility, setMediaVisibility] = useState<"admin" | "client" | "public">("client");
  const [mediaSignedUrls, setMediaSignedUrls] = useState<Record<string, { url: string; isMissing: boolean }>>({});

  // Extra Form Media Attachments
  const [extraSelectedFiles, setExtraSelectedFiles] = useState<File[]>([]);

  // Media Lightbox Modal State (Requirement 8)
  const [lightboxMedia, setLightboxMedia] = useState<ServiceJobMediaRecord | null>(null);

  // Media Filter State
  const [mediaFilter, setMediaFilter] = useState<"all" | "client" | "admin" | "portfolio">("all");

  // Offline Signed Contract Confirmation State (Requirement 5 & 6)
  const [isOfflineUploadOpen, setIsOfflineUploadOpen] = useState(false);
  const [isSubmittingOfflineDoc, setIsSubmittingOfflineDoc] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    file: null as File | null,
    fileUrl: "",
    signedByClient: false,
    clientLegalName: "",
    signedDate: new Date().toISOString().slice(0, 10),
    uploadedBy: user?.name || user?.email || "Manager",
    notes: ""
  });

  // Client Payment Validation & Editing State
  const [paymentToValidate, setPaymentToValidate] = useState<ClientPayment | null>(null);
  const [validationAction, setValidationAction] = useState<'approve' | 'reject'>('approve');
  const [validatingUserName, setValidatingUserName] = useState(user?.name || "Hugo Luiz Ferreira dos Santos");
  const [cancellationReason, setCancellationReason] = useState("");
  const [isValidatingPayment, setIsValidatingPayment] = useState(false);

  const [editingPayment, setEditingPayment] = useState<ClientPayment | null>(null);
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "zelle",
    date: new Date().toISOString().slice(0, 10),
    note: ""
  });
  const [isSavingPaymentEdit, setIsSavingPaymentEdit] = useState(false);

  const orgId = user?.organization?.id || DEFAULT_ORG_ID;

  const loadMediaSignedUrls = useCallback(async (records: ServiceJobMediaRecord[]) => {
    const urlMap: Record<string, { url: string; isMissing: boolean }> = {};
    await Promise.all(
      records.map(async (m) => {
        try {
          const url = await resolveSignedMediaUrl(m.storage_path);
          if (url) {
            urlMap[m.id] = { url, isMissing: false };
          } else {
            urlMap[m.id] = { url: "", isMissing: true };
          }
        } catch (err) {
          urlMap[m.id] = { url: "", isMissing: true };
        }
      })
    );
    setMediaSignedUrls(prev => ({ ...prev, ...urlMap }));
  }, []);

  // Load Job Workspace Data Modularly
  const loadJobWorkspace = useCallback(async () => {
    if (!jobId || !supabase) return;
    setIsLoading(true);

    try {
      // 1. Fetch Main Service Job
      const { data: jobData, error: jobError } = await supabase
        .from("service_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !jobData) {
        console.error("Job load error:", jobError);
        toast.error("Service Job not found.");
        setIsLoading(false);
        return;
      }

      setJob(jobData);

      // 2. Derive linked Estimate and Lead concurrently
      const [estRes, leadRes, companyRes] = await Promise.all([
        jobData.estimate_id ? getEstimateById(jobData.estimate_id).catch(() => null) : Promise.resolve(null),
        jobData.lead_id ? supabase.from("leads").select("*").eq("id", jobData.lead_id).maybeSingle() : Promise.resolve({ data: null }),
        getCompanySettings(orgId).catch(() => null)
      ]);

      setEstimate(estRes);
      setLead(leadRes.data || null);
      setCompanySettings(companyRes);

      // 3. Fetch independent modules via Promise.all
      const [extrasData, mediaData, allExpenses, allPayments, fetchedPartners] = await Promise.all([
        getServiceExtrasByJobId(jobId).catch(() => []),
        getJobMediaRecords(jobId).catch(() => []),
        getExpenses(orgId).catch(() => []),
        getClientPayments(orgId).catch(() => []),
        getOrganizationPartners(orgId).catch(() => [])
      ]);

      setExtras(extrasData || []);
      setMedia(mediaData || []);
      setPartners(fetchedPartners || []);
      if (mediaData && mediaData.length > 0) {
        loadMediaSignedUrls(mediaData);
      }
      
      // Filter expenses for this job
      const jobExpenses = (allExpenses || []).filter(
        e => e.service_job_id === jobId || e.estimate_id === jobData.estimate_id
      );
      setExpenses(jobExpenses);

      // Filter payments for this job/estimate
      const jobPayments = (allPayments || []).filter(
        p => p.service_job_id === jobId || p.estimate_id === jobData.estimate_id
      );
      setPayments(jobPayments);

    } catch (err: any) {
      console.error("Critical error in JobWorkspace:", err);
      toast.error("Error loading project workspace data.");
    } finally {
      setIsLoading(false);
    }
  }, [jobId, orgId]);

  useEffect(() => {
    if (isUserLoading) return;
    loadJobWorkspace();
  }, [isUserLoading, loadJobWorkspace]);

  // Helper to identify partner settlements ("pagamentos entre sócios")
  const isPartnerSettlement = useCallback((e: Expense) => {
    return (
      e.expense_category === 'partner_reimbursable' ||
      (e.expense_category as string) === 'partner_reimbursement' ||
      e.vendor?.toLowerCase().includes('partner settlement') ||
      e.notes?.toLowerCase().includes('baixa realizada') ||
      e.notes?.toLowerCase().includes('pagamento entre socio')
    );
  }, []);

  // Derived Financial Math (Requirements 5 & 6)
  const financialSummary = useMemo(() => {
    const originalContractValue = estimate?.total_amount || 0;

    const approvedExtras = extras
      .filter(e => e.status === 'approved')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const pendingExtras = extras
      .filter(e => e.status === 'pending' || (e.status as string) === 'sent' || (e.status as string) === 'draft')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const currentContractValue = originalContractValue + approvedExtras;

    // Client Materials (billed directly or reimbursable by client)
    const clientMaterialsList = expenses.filter(
      e => e.bill_to_client || (e as any).material_responsibility === 'client'
    );

    const clientMaterials = clientMaterialsList.reduce((acc, e) => acc + (e.amount || 0), 0);

    const unpaidClientMaterials = clientMaterialsList
      .filter(e => e.client_reimbursement_status !== 'paid')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const totalClientResponsibility = currentContractValue + clientMaterials;

    const amountPaid = payments
      .filter(p => p.status === 'received')
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const balanceDue = Math.max(0, totalClientResponsibility - amountPaid);

    // Company Job Costs (materials & expenses paid by company, excluding settlements and deleted)
    const companyMaterialsCost = expenses
      .filter(e => !e.bill_to_client && (e as any).material_responsibility !== 'client' && e.status !== 'deleted' && !isPartnerSettlement(e))
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const grossJobProfit = totalClientResponsibility - companyMaterialsCost;
    const profitMargin = totalClientResponsibility > 0 ? (grossJobProfit / totalClientResponsibility) * 100 : 0;

    return {
      originalContractValue,
      approvedExtras,
      pendingExtras,
      currentContractValue,
      clientMaterials,
      unpaidClientMaterials,
      totalClientResponsibility,
      amountPaid,
      balanceDue,
      companyMaterialsCost,
      grossJobProfit,
      profitMargin
    };
  }, [estimate, extras, expenses, payments, isPartnerSettlement]);

  // Helper to identify corporate company card expenses (direct company card/account)
  const isCompanyCard = useCallback((e: Expense) => {
    if (!e) return false;
    const pSource = (e.payment_source || '').toLowerCase().trim();
    const pName = (e.paid_by_name || '').toLowerCase().trim();
    const notes = (e.notes || '').toLowerCase();

    if (pSource === 'company_card' || pSource === 'company_account' || pSource === 'corporate') {
      return true;
    }
    if (!pName || pName === 'company card' || pName === 'company card / account' || pName.includes('company') || pName.includes('empresa') || pName.includes('cartão') || pName.includes('cartao da empresa') || pName.includes('corporate')) {
      return true;
    }
    if (notes.includes('company card') || notes.includes('cartao da empresa') || notes.includes('cartão da empresa')) {
      return true;
    }
    return false;
  }, []);

  // Derived Partner Accounting Breakdown (Requirements for Hugo vs Partner 50/50)
  const partnerAccountingSummary = useMemo(() => {
    // Filter ALL internal company job expenses (excluding deleted, client materials, and settlements)
    const companyExpenses = expenses.filter(
      e => !e.bill_to_client && 
           (e as any).material_responsibility !== 'client' && 
           e.status !== 'deleted' && 
           !isPartnerSettlement(e)
    );

    const totalCompanyCost = companyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Active partners names
    const activePartners = partners.filter(p => p.active !== false);
    const hugoName = activePartners.find(p => p.name.toLowerCase().includes("hugo"))?.name || "Hugo Luiz Ferreira dos Santos";
    const partner2Name = activePartners.find(p => !p.name.toLowerCase().includes("hugo"))?.name || "Adelmo Partner";

    // Split company expenses into out-of-pocket (partner cards/cash) vs corporate company card
    const companyCardExpenses = companyExpenses.filter(e => isCompanyCard(e));
    const companyCardPaid = companyCardExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const outOfPocketExpenses = companyExpenses.filter(e => !isCompanyCard(e));

    const hugoOutofPocketExpenses = outOfPocketExpenses.filter(e => e.paid_by_name?.toLowerCase().includes("hugo"));
    const partner2OutofPocketExpenses = outOfPocketExpenses.filter(e => 
      e.paid_by_name?.toLowerCase().includes("adelmo") || 
      (!e.paid_by_name?.toLowerCase().includes("hugo") && !isCompanyCard(e))
    );

    const hugoPaid = hugoOutofPocketExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const partner2Paid = partner2OutofPocketExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate settlements ("pagamentos entre sócios")
    const settlementRecords = expenses.filter(
      e => e.status !== 'deleted' && isPartnerSettlement(e)
    );
    const totalSettledAmount = settlementRecords.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Track directional settlement payments
    let hugoSettledToPartner2 = 0;
    let partner2SettledToHugo = 0;

    for (const s of settlementRecords) {
      const amt = s.amount || 0;
      const payer = (s.paid_by_name || '').toLowerCase();
      const vendor = (s.vendor || '').toLowerCase();
      
      if (payer.includes('hugo') || vendor.includes('hugo ->') || vendor.includes('hugo luiz ->')) {
        hugoSettledToPartner2 += amt;
      } else {
        partner2SettledToHugo += amt;
      }
    }

    // Directional Net Outlays:
    // Hugo Net Credit = Hugo OutOfPocket + Hugo Settlements Paid to Adelmo - Hugo Settlements Received from Adelmo
    const hugoNetCredit = hugoPaid + hugoSettledToPartner2 - partner2SettledToHugo;
    
    // Adelmo Net Credit = Adelmo OutOfPocket + Adelmo Settlements Paid to Hugo - Adelmo Settlements Received from Hugo
    const partner2NetCredit = partner2Paid + partner2SettledToHugo - hugoSettledToPartner2;

    const netDifference = hugoNetCredit - partner2NetCredit;
    const targetTransfer = Math.abs(netDifference) / 2;

    let netOwedFrom = "";
    let netOwedTo = "";
    let netOwedAmount = 0;

    if (netDifference > 0.01) {
      netOwedFrom = partner2Name;
      netOwedTo = hugoName;
      netOwedAmount = targetTransfer;
    } else if (netDifference < -0.01) {
      netOwedFrom = hugoName;
      netOwedTo = partner2Name;
      netOwedAmount = targetTransfer;
    }

    const isSettled = netOwedAmount <= 0.01;

    return {
      companyExpenses,
      outOfPocketExpenses,
      hugoOutofPocketExpenses,
      partner2OutofPocketExpenses,
      totalCompanyCost,
      hugoPaid,
      partner2Paid,
      companyCardPaid,
      settlementRecords,
      totalSettledAmount,
      hugoName,
      partner2Name,
      netOwedFrom,
      netOwedTo,
      netOwedAmount,
      targetTransfer,
      isSettled
    };
  }, [expenses, partners]);

  const clientMaterialsByPartner = useMemo(() => {
    const map: Record<string, { partnerName: string; amount: number }> = {};
    const clientMats = expenses.filter(e => 
      (e.bill_to_client === true || (e as any).material_responsibility === 'client') &&
      e.expense_category !== 'partner_reimbursable' &&
      (e.expense_category as string) !== 'partner_reimbursement'
    );

    for (const exp of clientMats) {
      const rawPayer = (exp.paid_by_name || "Company Card / Account").trim();
      
      // Match case-insensitively against partners list
      const matchedPartner = partners.find(p => {
        const pName = p.name.trim().toLowerCase();
        const rawLower = rawPayer.toLowerCase();
        return pName === rawLower || rawLower.includes(pName) || pName.includes(rawLower) || (pName.split(' ')[0] === rawLower.split(' ')[0] && pName.split(' ')[0].length > 2);
      });

      const canonicalName = matchedPartner ? matchedPartner.name : rawPayer;
      const groupKey = canonicalName.toLowerCase();

      if (!map[groupKey]) {
        map[groupKey] = { partnerName: canonicalName, amount: 0 };
      }
      map[groupKey].amount += exp.amount || 0;
    }
    return Object.values(map);
  }, [expenses, partners]);

  const sortedCompanyExpenses = useMemo(() => {
    return expenses
      .filter(e => !e.bill_to_client && e.status !== 'deleted')
      .sort((a, b) => {
        const dateA = new Date(a.receipt_date || a.created_at || 0).getTime();
        const dateB = new Date(b.receipt_date || b.created_at || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        const createdA = new Date(a.created_at || 0).getTime();
        const createdB = new Date(b.created_at || 0).getTime();
        return createdB - createdA;
      });
  }, [expenses]);

  const [expenseSelectedFile, setExpenseSelectedFile] = useState<File | null>(null);
  const [isPartnerAuditModalOpen, setIsPartnerAuditModalOpen] = useState(false);

  interface DetailItemModalState {
    type: 'client_material' | 'company_material' | 'partner_settlement' | 'extra';
    item: any;
    mediaUrl?: string | null;
    extraMediaUrls?: string[];
  }

  const [detailModalItem, setDetailModalItem] = useState<DetailItemModalState | null>(null);
  const [isLoadingDetailMedia, setIsLoadingDetailMedia] = useState(false);

  const handleOpenItemDetail = async (item: any, type: 'client_material' | 'company_material' | 'partner_settlement' | 'extra') => {
    setIsLoadingDetailMedia(true);
    setDetailModalItem({ type, item, mediaUrl: null, extraMediaUrls: [] });

    try {
      if (type === 'extra') {
        const records = await getExtraMediaRecords(item.id).catch(() => []);
        const urls: string[] = [];
        for (const r of records) {
          const u = await resolveSignedMediaUrl(r.storage_path);
          if (u) urls.push(u);
        }
        setDetailModalItem(prev => prev ? { ...prev, extraMediaUrls: urls } : null);
      } else {
        let path = item.receipt_storage_path || item.storage_path;
        if (!path && item.receipt_files && item.receipt_files.length > 0) {
          path = item.receipt_files[0].storage_path;
        }
        if (path) {
          const u = await resolveSignedMediaUrl(path);
          setDetailModalItem(prev => prev ? { ...prev, mediaUrl: u } : null);
        }
      }
    } catch (err) {
      console.warn("Error resolving detail media:", err);
    } finally {
      setIsLoadingDetailMedia(false);
    }
  };

  const handleStartEditSettlement = (exp: Expense) => {
    setEditingExpense(exp);
    const payer = exp.paid_by_name || "Hugo Luiz Ferreira dos Santos";
    const receiver = exp.vendor?.includes("->") ? exp.vendor.split("->")[1].replace(")", "").trim() : "Adelmo Ferreira dos Santos";
    setSettlementForm({
      payerName: payer,
      receiverName: receiver,
      amount: exp.amount ? String(exp.amount) : "",
      date: exp.receipt_date || new Date().toISOString().slice(0, 10),
      paymentMethod: exp.payment_method || "zelle",
      notes: exp.notes?.replace("Partner Reimbursement Settlement (Baixa Realizada): ", "") || ""
    });
    setIsPartnerSettlementOpen(true);
  };

  const handleSettlementSubmit = async () => {
    if (!job || !settlementForm.amount || parseFloat(settlementForm.amount) <= 0) {
      toast.error("Por favor, informe um valor válido para a baixa.");
      return;
    }

    setIsSavingSettlement(true);
    try {
      const amount = parseFloat(settlementForm.amount);
      const maxAllowed = partnerAccountingSummary.netOwedAmount;

      if (!editingExpense && amount > maxAllowed + 0.01) {
        toast.error(`O valor da baixa ($${amount.toFixed(2)}) não pode ser maior do que o saldo devedor entre os sócios ($${maxAllowed.toFixed(2)}).`);
        setIsSavingSettlement(false);
        return;
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount,
          vendor: `Partner Settlement (${settlementForm.payerName} -> ${settlementForm.receiverName})`,
          receipt_date: settlementForm.date,
          expense_category: "partner_reimbursable",
          payment_method: settlementForm.paymentMethod as any,
          paid_by_name: settlementForm.payerName,
          notes: `Partner Reimbursement Settlement (Baixa Realizada): ${settlementForm.notes || 'Settled'}`,
          reimbursement_status: "reimbursed"
        });
        toast.success("Baixa entre sócios alterada com sucesso!");
        setIsPartnerSettlementOpen(false);
        setEditingExpense(null);
        loadJobWorkspace();
        return;
      }

      const { receipt: created } = await createExpense({
        organization_id: orgId,
        service_job_id: job.id,
        estimate_id: job.estimate_id || estimate?.id || null,
        amount,
        vendor: `Partner Settlement (${settlementForm.payerName} -> ${settlementForm.receiverName})`,
        receipt_date: settlementForm.date,
        expense_category: "partner_reimbursable",
        payment_method: settlementForm.paymentMethod as any,
        payment_source: "partner_personal",
        paid_by_name: settlementForm.payerName,
        bill_to_client: false,
        material_responsibility: "company",
        reimbursement_status: "reimbursed",
        notes: `Partner Reimbursement Settlement (Baixa Realizada): ${settlementForm.notes || 'Settled'}`,
        status: "active"
      } as any, settlementFile || undefined);

      if (created) {
        setExpenses(prev => [created, ...prev]);
      }

      setIsPartnerSettlementOpen(false);
      setSettlementForm({
        payerName: "",
        receiverName: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: "zelle",
        notes: ""
      });
      setSettlementFile(null);
      setSettlementFileUrl(null);
      toast.success("Partner settlement logged & balance updated (Baixa realizada)!");
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Settlement error:", err);
      toast.error("Failed to register partner settlement.");
    } finally {
      setIsSavingSettlement(false);
    }
  };

  // Client Payment Validation & Management Handlers
  const handleValidatePaymentSubmit = async () => {
    if (!paymentToValidate) return;
    setIsValidatingPayment(true);
    try {
      const validatorName = validatingUserName.trim() || user?.name || "Proprietário H&A";
      if (validationAction === 'approve') {
        await updateClientPayment(paymentToValidate.id, {
          status: "received",
          receipt_status: "sent",
          note: `${paymentToValidate.note || ""} [Validado por: ${validatorName}]`.trim()
        });
        toast.success(`Pagamento de $${paymentToValidate.amount} APROVADO e validado por ${validatorName}!`);
      } else {
        const reason = cancellationReason.trim() || "Depósito não verificado na conta bancária.";
        await updateClientPayment(paymentToValidate.id, {
          status: "cancelled",
          receipt_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          note: `${paymentToValidate.note || ""} [CANCELADO por ${validatorName}: ${reason}]`.trim()
        });
        toast.success(`Pagamento CANCELADO / REJEITADO por ${validatorName}.`);
      }
      setPaymentToValidate(null);
      setCancellationReason("");
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Error validating payment:", err);
      toast.error("Falha ao processar validação do pagamento.");
    } finally {
      setIsValidatingPayment(false);
    }
  };

  const handleDeleteClientPayment = async (paymentId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta baixa/pagamento do cliente?")) return;
    try {
      await deleteClientPayment(paymentId);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      toast.success("Pagamento do cliente excluído com sucesso!");
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Delete client payment error:", err);
      toast.error("Falha ao excluir pagamento.");
    }
  };

  const handleStartEditClientPayment = (payment: ClientPayment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: payment.amount.toString(),
      method: payment.method || "zelle",
      date: payment.payment_date ? new Date(payment.payment_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      note: payment.note || ""
    });
    setIsEditPaymentOpen(true);
  };

  const handleSaveClientPaymentEdit = async () => {
    if (!editingPayment || !paymentForm.amount) return;
    setIsSavingPaymentEdit(true);
    try {
      await updateClientPayment(editingPayment.id, {
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method as any,
        payment_date: paymentForm.date,
        note: paymentForm.note
      });
      toast.success("Pagamento atualizado com sucesso!");
      setIsEditPaymentOpen(false);
      setEditingPayment(null);
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Update client payment error:", err);
      toast.error("Falha ao atualizar pagamento.");
    } finally {
      setIsSavingPaymentEdit(false);
    }
  };

  // Action Handlers
  const handleUpdateJobStatus = async (newStatus: "scheduled" | "in_progress" | "completed") => {
    if (!job || !supabase) return;
    setIsUpdatingStatus(true);
    try {
      const now = new Date().toISOString();
      const updates: Record<string, any> = {
        status: newStatus,
        started_at: newStatus === "in_progress" && !job.started_at ? now : job.started_at,
        completed_at: newStatus === "completed" ? now : job.completed_at
      };

      const { error } = await supabase
        .from("service_jobs")
        .update(updates)
        .eq("id", job.id);

      if (error) throw error;

      setJob((prev: any) => ({ ...prev, ...updates }));
      toast.success(`Job status updated to ${newStatus.replace("_", " ")}!`);
    } catch (err: any) {
      console.error("Job status update error:", err);
      toast.error(`Failed to update status: ${err?.message || "Database error"}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSignedDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !estimate) return;

    setOfflineForm({
      file,
      fileUrl: URL.createObjectURL(file),
      signedByClient: true,
      clientLegalName: estimate.client_name || "",
      signedDate: new Date().toISOString().slice(0, 10),
      uploadedBy: user?.name || user?.email || "Manager",
      notes: ""
    });
    setIsOfflineUploadOpen(true);
  };

  const handleConfirmOfflineSignedContract = async () => {
    if (!estimate || !offlineForm.file) {
      toast.error("Please select a signed document file.");
      return;
    }
    if (!offlineForm.signedByClient) {
      toast.error("You must confirm that the client physically signed the document.");
      return;
    }
    if (!offlineForm.clientLegalName.trim()) {
      toast.error("Client Legal Name is required.");
      return;
    }

    setIsSubmittingOfflineDoc(true);
    try {
      const file = offlineForm.file;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let docUrl = dataUrl;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${orgId}/signed_contracts/${estimate.id}-${Date.now()}.${fileExt}`;
        const filePath = `documents/${fileName}`;
        const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file);
        if (!uploadErr) {
          const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
          if (data?.publicUrl) docUrl = data.publicUrl;
        }
      } catch (sErr) {
        console.warn("Storage upload for signed doc handled, using Data URL fallback:", sErr);
      }

      // 1. Update Estimate status to Approved with metadata
      await supabase
        .from('estimates')
        .update({
          status: 'Approved',
          approved_at: new Date(offlineForm.signedDate).toISOString(),
          signed_document_url: docUrl,
          signature_type: 'offline_paper',
          signed_by_name: offlineForm.clientLegalName.trim()
        })
        .eq('id', estimate.id);

      // 2. Audit Event Recording (Requirement 5)
      try {
        await supabase.from('document_audit_logs').insert([{
          organization_id: orgId,
          document_type: 'estimate',
          document_id: estimate.id,
          event_type: 'offline_signed_contract_uploaded',
          performed_by: user?.id || 'admin',
          metadata_json: {
            client_legal_name: offlineForm.clientLegalName.trim(),
            signed_date: offlineForm.signedDate,
            uploaded_by: offlineForm.uploadedBy,
            notes: offlineForm.notes,
            file_url: docUrl
          }
        }]);

        await supabase.from('document_audit_logs').insert([{
          organization_id: orgId,
          document_type: 'estimate',
          document_id: estimate.id,
          event_type: 'offline_contract_approved',
          performed_by: user?.id || 'admin',
          metadata_json: {
            approved_at: new Date().toISOString()
          }
        }]);
      } catch (auditErr) {
        console.warn("Audit event logging handled:", auditErr);
      }

      toast.success("Offline Signed Contract confirmed and Approved!");
      setIsOfflineUploadOpen(false);
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Error confirming offline signed contract:", err);
      toast.error(err?.message || "Failed to confirm offline contract.");
    } finally {
      setIsSubmittingOfflineDoc(false);
    }
  };

  const handleAddExtraSubmit = async () => {
    if (!job || !extraForm.description.trim() || !extraForm.amount) {
      toast.error("Description and Extra Amount are required.");
      return;
    }

    setIsSavingExtra(true);
    try {
      const extraAmount = parseFloat(extraForm.amount);
      const previousPrice = financialSummary.currentContractValue;

      const newExtra = await createServiceExtra({
        organization_id: orgId,
        service_job_id: job.id,
        estimate_id: job.estimate_id || null,
        description: extraForm.description.trim(),
        amount: extraAmount,
        previous_contract_price: previousPrice,
        schedule_impact: extraForm.scheduleImpact || undefined,
        reason: extraForm.reason.trim() || undefined
      });

      // Upload attached media files for extra and embed media URLs into reason for public access
      if (extraSelectedFiles.length > 0 && newExtra?.id) {
        const uploadedUrls: string[] = [];
        for (const file of extraSelectedFiles) {
          try {
            const isVideo = file.type.startsWith("video/");
            const fileExt = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
            const relativePath = `${orgId}/extras/${newExtra.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

            let finalPath = "";
            const { error: uErr } = await supabase.storage.from("images").upload(relativePath, file, { upsert: true });
            if (uErr) {
              const { error: docErr } = await supabase.storage.from("documents").upload(relativePath, file, { upsert: true });
              if (docErr) {
                if (!isVideo) {
                  finalPath = await new Promise<string>((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(r.result as string);
                    r.onerror = rej;
                    r.readAsDataURL(file);
                  });
                } else {
                  console.warn("Extra video storage upload failed:", docErr.message);
                  continue;
                }
              } else {
                finalPath = `documents/${relativePath}`;
              }
            } else {
              finalPath = `images/${relativePath}`;
            }

            await uploadExtraMediaRecord({
              organization_id: orgId,
              service_extra_id: newExtra.id,
              media_type: isVideo ? "video" : "image",
              storage_path: finalPath,
              file_name: file.name,
              mime_type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
              file_size_bytes: file.size,
              caption: extraForm.description.trim()
            });

            const resolvedUrl = await resolveSignedMediaUrl(finalPath);
            if (resolvedUrl) uploadedUrls.push(resolvedUrl);
          } catch (mediaErr: any) {
            console.warn("Extra media upload handled:", mediaErr);
          }
        }

        if (uploadedUrls.length > 0) {
          const baseReason = extraForm.reason.trim() || "";
          const mediaTags = uploadedUrls.map(u => `[media:${u}]`).join(" ");
          const combinedReason = baseReason ? `${baseReason} ${mediaTags}` : mediaTags;
          
          await supabase
            .from('service_extras')
            .update({ reason: combinedReason })
            .eq('id', newExtra.id);

          newExtra.reason = combinedReason;
        }
      }

      setExtras(prev => [newExtra, ...prev]);
      setIsAddExtraOpen(false);
      setExtraForm({ description: "", reason: "", amount: "", scheduleImpact: "0 days" });
      setExtraSelectedFiles([]);
      setActiveTab("extras");
      toast.success("Change Order created successfully!");
    } catch (err: any) {
      console.error("Create extra error:", err);
      toast.error(`Failed to create Extra: ${err?.message || "Database error"}`);
    } finally {
      setIsSavingExtra(false);
    }
  };

  const handleCopyExtraLink = async (extra: ServiceExtra) => {
    let estToken = estimate?.public_token;
    if (!estToken && (extra.estimate_id || job?.estimate_id)) {
      try {
        const estId = extra.estimate_id || job?.estimate_id;
        if (estId) {
          const est = await getEstimateById(estId);
          if (est?.public_token) estToken = est.public_token;
        }
      } catch (e) {}
    }

    if (estToken) {
      const url = `${window.location.origin}/estimate/${estToken}#extras`;
      await navigator.clipboard.writeText(url);
      toast.success("Extra link copied (unified client portal)!");
    } else if (extra.public_token && !extra.public_token.startsWith("lead_") && !/^[0-9a-f]{8}-/i.test(extra.public_token)) {
      const url = `${window.location.origin}/extra/${extra.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Extra proposal link copied!");
    } else {
      toast.error("Could not resolve estimate public token for this extra.");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this material record?")) return;
    try {
      await deleteExpense(expenseId);
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      toast.success("Material deleted successfully!");
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Delete expense error:", err);
      toast.error("Failed to delete material.");
    }
  };

  const handleMarkAsCompanyCard = async (expenseId: string) => {
    try {
      await updateExpense(expenseId, {
        paid_by_name: "Company Card / Account",
        payment_source: "company_card",
        reimbursable_to_owner: false,
        reimbursement_status: "not_reimbursable"
      });
      toast.success("Despesa alterada para Cartão da Empresa com sucesso!");
      loadJobWorkspace();
    } catch (err) {
      console.error("Error updating expense to company card:", err);
      toast.error("Erro ao alterar despesa para Cartão da Empresa.");
    }
  };

  const handleOpenAddClientExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      description: "",
      vendor: "",
      amount: "",
      receiptDate: new Date().toISOString().slice(0, 10),
      paidByName: "Company Card / Account",
      paymentSource: "company_card",
      reimbursableToOwner: false,
      billToClient: true
    });
    setExpenseSelectedFile(null);
    setIsAddExpenseOpen(true);
  };

  const handleOpenAddCompanyExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      description: "",
      vendor: "",
      amount: "",
      receiptDate: new Date().toISOString().slice(0, 10),
      paidByName: "Company Card / Account",
      paymentSource: "company_card",
      reimbursableToOwner: false,
      billToClient: false
    });
    setExpenseSelectedFile(null);
    setIsAddExpenseOpen(true);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    const isComp = isCompanyCard(exp);
    setExpenseForm({
      description: exp.notes?.replace("Job Expense for ", "") || exp.vendor || "",
      vendor: exp.vendor || "",
      amount: exp.amount ? String(exp.amount) : "",
      receiptDate: exp.receipt_date || new Date().toISOString().slice(0, 10),
      paidByName: exp.paid_by_name || (isComp ? "Company Card / Account" : user?.name || "Hugo Manager"),
      paymentSource: exp.payment_source || (isComp ? "company_card" : "partner_personal"),
      reimbursableToOwner: exp.reimbursable_to_owner,
      billToClient: exp.bill_to_client
    });
    setExpenseSelectedFile(null);
    setIsAddExpenseOpen(true);
  };

  const handleAddExpenseSubmit = async () => {
    if (!job || !expenseForm.description.trim() || !expenseForm.amount) {
      toast.error("Description and Amount are required.");
      return;
    }

    setIsSavingExpense(true);
    try {
      const amount = parseFloat(expenseForm.amount);
      const isCompanyMaterial = !expenseForm.billToClient;

      if (editingExpense) {
        const updated = await updateExpense(editingExpense.id, {
          amount,
          vendor: expenseForm.vendor.trim() || "Supplier",
          receipt_date: expenseForm.receiptDate,
          paid_by_name: expenseForm.paidByName,
          payment_source: expenseForm.paymentSource as any,
          material_responsibility: isCompanyMaterial ? "company" : "client",
          reimbursable_to_owner: expenseForm.reimbursableToOwner,
          bill_to_client: expenseForm.billToClient,
          notes: `Job Expense for ${expenseForm.description}`
        });
        setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, ...updated } : e));
        setEditingExpense(null);
        setIsAddExpenseOpen(false);
        setIsSavingExpense(false);
        toast.success("Material updated successfully!");
        loadJobWorkspace();
        return;
      }

      // Find partner matching paidByName if paid personally by partner
      const matchedPartner = partners.find(p => 
        p.name === expenseForm.paidByName || 
        expenseForm.paidByName.includes(p.name) ||
        p.name.includes(expenseForm.paidByName.split(' ')[0])
      );

      const { receipt: created } = await createExpense({
        organization_id: orgId,
        service_job_id: job.id,
        estimate_id: job.estimate_id || estimate?.id || null,
        related_lead_id: job.lead_id || (estimate as any)?.lead_id || null,
        amount,
        vendor: expenseForm.vendor.trim() || "Supplier",
        receipt_date: expenseForm.receiptDate,
        expense_category: "job_material",
        payment_method: "card",
        payment_source: expenseForm.paymentSource as any,
        paid_by_name: expenseForm.paidByName,
        paid_by_partner_id: matchedPartner?.id || null,
        material_responsibility: isCompanyMaterial ? "company" : "client",
        reimbursable_to_owner: expenseForm.reimbursableToOwner,
        bill_to_client: expenseForm.billToClient,
        reimbursement_status: expenseForm.reimbursableToOwner ? "pending" : "not_reimbursable",
        client_reimbursement_status: expenseForm.billToClient ? "pending" : "not_billable",
        notes: `Job Expense for ${expenseForm.description}`,
        status: "active"
      } as any, expenseSelectedFile || undefined);

      setExpenseSelectedFile(null);

      // Create bulk partner allocations if Company Material paid by Partner
      if (isCompanyMaterial && matchedPartner && created?.id) {
        try {
          const activePartners = partners.filter(p => p.active !== false);
          if (activePartners.length > 0) {
            let remainingCents = Math.round(amount * 100);
            const allocationsBulk = activePartners.map((p, idx) => {
              let allocCents = Math.floor(amount * 100 * (p.ownership_percentage / 100));
              if (idx === activePartners.length - 1) {
                allocCents = remainingCents; // Allocate remaining cents deterministically
              } else {
                remainingCents -= allocCents;
              }
              const allocAmount = allocCents / 100;
              return {
                organization_id: orgId,
                expense_id: created.id,
                partner_id: p.id,
                ownership_percentage_snapshot: p.ownership_percentage,
                original_allocated_amount: allocAmount
              };
            });

            await supabase.from("partner_expense_allocations").insert(allocationsBulk);
          }
        } catch (allocErr) {
          console.warn("Bulk partner allocation insert handled:", allocErr);
        }
      }

      if (created) {
        setExpenses(prev => [created, ...prev]);
      }

      setIsAddExpenseOpen(false);
      setExpenseForm({
        description: "",
        vendor: "",
        amount: "",
        receiptDate: new Date().toISOString().slice(0, 10),
        paidByName: user?.name || "Hugo Manager",
        paymentSource: "owner_personal",
        reimbursableToOwner: false,
        billToClient: true
      });
      setActiveTab("materials");
      toast.success(isCompanyMaterial ? "Company Material & Partner Allocations logged!" : "Client Material logged successfully!");
      loadJobWorkspace();
    } catch (err: any) {
      console.error("Create expense error:", err);
      toast.error(`Could not save material: ${err?.message || "Database error"}`);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleMediaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedMediaFiles(prev => [...prev, ...files]);
      setSelectedMediaFile(files[0]);
      if (!mediaFileUrl && files[0]) {
        setMediaFileUrl(URL.createObjectURL(files[0]));
      }
    }
  };

  const handleAddMediaSubmit = async () => {
    const targetFiles = selectedMediaFiles.length > 0 ? selectedMediaFiles : selectedMediaFile ? [selectedMediaFile] : [];
    if (!job || targetFiles.length === 0) {
      toast.error("Por favor, selecione pelo menos uma foto ou vídeo.");
      return;
    }

    setIsSavingMedia(true);
    try {
      const uploadedRecords: ServiceJobMediaRecord[] = [];

      for (const file of targetFiles) {
        const isVideo = file.type.startsWith("video/");
        const mediaType = isVideo ? "video" : "image";
        const fileExt = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const relativePath = `${orgId}/jobs/${job.id}/${isVideo ? "videos" : "photos"}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

        let finalPath = "";
        const { error: uploadErr } = await supabase.storage
          .from("images")
          .upload(relativePath, file, { upsert: true, cacheControl: "3600" });

        if (uploadErr) {
          const { error: docUploadErr } = await supabase.storage
            .from("documents")
            .upload(relativePath, file, { upsert: true, cacheControl: "3600" });

          if (docUploadErr) {
            if (!isVideo) {
              finalPath = await new Promise<string>((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result as string);
                r.onerror = rej;
                r.readAsDataURL(file);
              });
            } else {
              console.error("Storage upload failed for file:", file.name);
              continue;
            }
          } else {
            finalPath = `documents/${relativePath}`;
          }
        } else {
          finalPath = `images/${relativePath}`;
        }

        const record = await uploadJobMediaRecord({
          organization_id: orgId,
          service_job_id: job.id,
          media_type: mediaType,
          storage_path: finalPath,
          file_name: file.name,
          mime_type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
          file_size_bytes: file.size,
          caption: mediaCaption.trim() || "Job progress documentation",
          visible_to_client: true,
          visible_on_public_site: true
        });

        uploadedRecords.push(record);
      }

      if (uploadedRecords.length > 0) {
        const updated = [...uploadedRecords, ...media];
        setMedia(updated);
        setIsAddMediaOpen(false);
        setSelectedMediaFile(null);
        setSelectedMediaFiles([]);
        setMediaFileUrl(null);
        setMediaCaption("");
        setActiveTab("media");
        toast.success(`${uploadedRecords.length} foto(s)/vídeo(s) enviado(s) com sucesso!`);
        await loadMediaSignedUrls(updated);
      } else {
        toast.error("Nenhum arquivo pôde ser enviado.");
      }
    } catch (err: any) {
      console.error("Upload job media error:", err);
      toast.error(`Falha ao enviar fotos/vídeos: ${err?.message || "Erro de armazenamento"}`);
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleDeleteMediaRecord = async (mediaId: string) => {
    try {
      await deleteJobMediaRecord(mediaId);
      setMedia(prev => prev.filter(m => m.id !== mediaId));
      toast.success("Broken media record removed.");
    } catch (err) {
      toast.error("Failed to delete media record.");
    }
  };

  const handleToggleMediaVisibility = async (mediaId: string, mode: "client" | "public" | "portfolio") => {
    const target = media.find(m => m.id === mediaId);
    if (!target) return;

    let updates: Partial<ServiceJobMediaRecord> = {};
    if (mode === "client") updates.visible_to_client = !target.visible_to_client;
    if (mode === "public") updates.visible_on_public_site = !target.visible_on_public_site;
    if (mode === "portfolio") updates.portfolio_approved = !target.portfolio_approved;

    try {
      await updateJobMediaVisibility(mediaId, updates);
      setMedia(prev => prev.map(m => m.id === mediaId ? { ...m, ...updates } : m));
      toast.success("Photo visibility updated!");
    } catch (err) {
      toast.error("Failed to update media visibility.");
    }
  };

  const handleGeneratePDF = async () => {
    if (!estimate) return;
    setIsGeneratingPDF(true);
    try {
      await generateProfessionalPDF(estimate, companySettings, {});
      toast.success("Estimate PDF generated!");
    } catch (err) {
      toast.error("Failed to generate PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const clientName = estimate?.client_name || lead?.fullName || "Client";
  const clientEmail = estimate?.client_email || lead?.email || "";
  const clientPhone = estimate?.client_phone || lead?.phone || "";
  const propertyAddress = estimate?.client_address || lead?.address || "Fairfield County, CT";
  const projectType = estimate?.project_type || lead?.serviceSlug || "Residential Project";

  const filteredMedia = useMemo(() => {
    return media.filter(m => {
      if (mediaFilter === "client") return m.visible_to_client;
      if (mediaFilter === "admin") return !m.visible_to_client;
      if (mediaFilter === "portfolio") return m.portfolio_approved;
      return true;
    });
  }, [media, mediaFilter]);

  const lightboxIndex = useMemo(() => {
    if (!lightboxMedia) return -1;
    return filteredMedia.findIndex(m => m.id === lightboxMedia.id);
  }, [filteredMedia, lightboxMedia]);

  const handleNextLightbox = () => {
    if (lightboxIndex >= 0 && lightboxIndex < filteredMedia.length - 1) {
      setLightboxMedia(filteredMedia[lightboxIndex + 1]);
    }
  };

  const handlePrevLightbox = () => {
    if (lightboxIndex > 0) {
      setLightboxMedia(filteredMedia[lightboxIndex - 1]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#0b2a4a] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading Project Workspace...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Service Job Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The requested job does not exist or has been removed.</p>
        <Button onClick={() => navigate("/admin/estimates")} className="bg-[#0b2a4a] text-white">
          Return to Estimates
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-2.5 text-xs text-gray-500 flex items-center gap-2">
        <button onClick={() => navigate("/admin/estimates")} className="hover:text-gray-900">Estimates</button>
        <ChevronRight className="h-3 w-3" />
        <span className="font-bold text-gray-900">{clientName}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-blue-600 font-semibold">{projectType}</span>
      </div>

      {/* FIXED STICKY PROJECT HEADER (Requirement 2) */}
      <header className="sticky top-0 z-30 bg-[#0b2a4a] text-white shadow-xl border-b border-blue-900/40 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/estimates")}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-9 w-9 shrink-0 mt-0.5"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">{clientName}</h1>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    job.status === "completed" ? "bg-emerald-500 text-white" :
                    job.status === "in_progress" ? "bg-blue-500 text-white" :
                    "bg-amber-500 text-white"
                  }`}>
                    {job.status?.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/90 mt-1 font-medium">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-400" /> {propertyAddress}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-blue-400" /> {projectType}</span>
                  {estimate && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-blue-300">EST #{estimate.id.split("-")[0].toUpperCase()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Header Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  const portalToken = estimate?.public_token || job?.id || estimate?.id;
                  if (portalToken) {
                    const url = `${window.location.origin}/estimate/${portalToken}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Client Project Portal link copied to clipboard!");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-3 rounded-xl shadow-sm gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Client Portal
              </Button>
              <Button
                onClick={() => setIsAddExtraOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-9 px-3 rounded-xl shadow-sm gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> + Extra
              </Button>
              <Button
                onClick={() => setIsRegisterPaymentOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3 rounded-xl shadow-sm gap-1.5"
              >
                <DollarSign className="h-3.5 w-3.5" /> Register Payment
              </Button>
              <Button
                onClick={() => setIsAddExpenseOpen(true)}
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold h-9 px-3 rounded-xl gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> + Material
              </Button>
              <Button
                onClick={() => setIsAddMediaOpen(true)}
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold h-9 px-3 rounded-xl gap-1.5"
              >
                <Images className="h-3.5 w-3.5" /> + Photo
              </Button>
            </div>
          </div>

          {/* Header Financial KPI Strip (Requirement 6) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-blue-300 uppercase tracking-widest font-bold block">Original Contract</span>
              <span className="text-sm font-bold text-white">${financialSummary.originalContractValue.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-purple-300 uppercase tracking-widest font-bold block">Approved Extras</span>
              <span className="text-sm font-bold text-purple-300">+${financialSummary.approvedExtras.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-blue-200 uppercase tracking-widest font-bold block">Current Contract</span>
              <span className="text-sm font-black text-white">${financialSummary.currentContractValue.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-amber-300 uppercase tracking-widest font-bold block">Client Materials</span>
              <span className="text-sm font-bold text-amber-300">+${financialSummary.clientMaterials.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-indigo-300 uppercase tracking-widest font-bold block">Total Responsibility</span>
              <span className="text-sm font-black text-indigo-200">${financialSummary.totalClientResponsibility.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-emerald-300 uppercase tracking-widest font-bold block">Amount Received</span>
              <span className="text-sm font-bold text-emerald-400">${financialSummary.amountPaid.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10">
              <span className="text-[9px] text-amber-200 uppercase tracking-widest font-bold block">Unpaid Materials</span>
              <span className="text-sm font-bold text-amber-300">${financialSummary.unpaidClientMaterials.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10 col-span-2 sm:col-span-1">
              <span className="text-[9px] text-orange-400 uppercase tracking-widest font-bold block">Balance Due</span>
              <span className="text-sm font-black text-orange-400">${financialSummary.balanceDue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE TAB BAR (Requirement 3) */}
      <div className="sticky top-[148px] z-20 bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex space-x-1 min-w-max py-2">
          {[
            { id: "overview", label: "Overview", icon: Sparkles },
            { id: "contract", label: "Contract / Estimate", icon: FileText },
            { id: "schedule", label: "Schedule", icon: Calendar },
            { id: "payments", label: `Payments (${payments.length})`, icon: CreditCard },
            { id: "extras", label: `Extras / Change Orders (${extras.length})`, icon: Tag },
            { id: "media", label: `Photos & Videos (${media.length})`, icon: Images },
            { id: "materials", label: `Materials & Expenses (${expenses.length})`, icon: Receipt },
            { id: "reimbursements", label: "Reimbursements", icon: DollarSign },
            { id: "documents", label: "Documents", icon: FileCheck },
            { id: "history", label: "History", icon: Clock },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#0b2a4a] text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN TAB CONTENT WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in">
            {/* Quick Actions & Status Control */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Job Status Control</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update site operational status directly from the workspace.</p>
              </div>
              <div className="flex items-center gap-2">
                {job.status === "scheduled" && (
                  <Button
                    onClick={() => handleUpdateJobStatus("in_progress")}
                    disabled={isUpdatingStatus}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl"
                  >
                    Start Job Execution
                  </Button>
                )}
                {job.status === "in_progress" && (
                  <Button
                    onClick={() => handleUpdateJobStatus("completed")}
                    disabled={isUpdatingStatus}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl"
                  >
                    Mark Job Completed
                  </Button>
                )}
                {job.status === "completed" && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 font-bold">
                    Job Completed
                  </Badge>
                )}
              </div>
            </div>

            {/* Overview Summary Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Client Info Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-[#0b2a4a] text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" /> Client Details
                </h3>
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-gray-900 text-sm">{clientName}</p>
                  {clientPhone && <p className="text-gray-600 flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {clientPhone}</p>}
                  {clientEmail && <p className="text-gray-600 flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" /> {clientEmail}</p>}
                  <p className="text-gray-600 flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {propertyAddress}</p>
                </div>
              </div>

              {/* Financial Breakdown Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-[#0b2a4a] text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Financial Summary
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Original Contract:</span>
                    <span className="font-bold text-gray-900">${financialSummary.originalContractValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Approved Extras ({extras.filter(e => e.status === 'approved').length}):</span>
                    <span className="font-bold text-purple-600">+${financialSummary.approvedExtras.toLocaleString()}</span>
                  </div>
                  {extras.filter(e => e.status === 'pending').length > 0 && (
                    <div className="flex justify-between items-center text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 text-[11px] font-semibold">
                      <span>Pending Extras ({extras.filter(e => e.status === 'pending').length}):</span>
                      <span className="font-bold text-amber-900">+${extras.filter(e => e.status === 'pending').reduce((s, x) => s + (x.amount || 0), 0).toLocaleString()} (Awaiting Approval)</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-100 font-bold">
                    <span className="text-gray-900">Current Total:</span>
                    <span className="text-blue-600">${financialSummary.currentContractValue.toLocaleString()}</span>
                  </div>
                  {extras.filter(e => e.status === 'pending').length > 0 && (
                    <p className="text-[10px] text-amber-700/80 italic -mt-1">
                      * Current Total reflects Original + Approved Extras. Pending extras enter contract upon client signature.
                    </p>
                  )}
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Paid to Date:</span>
                    <span>${financialSummary.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Balance Remaining:</span>
                    <span>${financialSummary.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Overview Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-[#0b2a4a] text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Project Workspace Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddExtraOpen(true)} className="h-9 text-xs font-bold">
                    + Add Extra
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsRegisterPaymentOpen(true)} className="h-9 text-xs font-bold">
                    Register Payment
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsAddExpenseOpen(true)} className="h-9 text-xs font-bold">
                    + Expense
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsAddMediaOpen(true)} className="h-9 text-xs font-bold">
                    + Photo
                  </Button>
                </div>
              </div>
            </div>

            {/* PARTNER COMPANY MATERIALS ACCOUNTING CARD (Requirements: Hugo & Adelmo 50/50 Split & Baixas) */}
            <div className="bg-white rounded-2xl border border-purple-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    Company Material &amp; Job Costs — Partner Accounting (50/50 Split)
                  </h3>
                  <p className="text-xs text-gray-500">Internal company job costs paid out-of-pocket by partners, split 50/50.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-900 font-bold text-xs px-3 py-1">
                    Total Company Job Cost: ${partnerAccountingSummary.totalCompanyCost.toLocaleString()}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPartnerAuditModalOpen(true)}
                    className="text-xs font-bold border-purple-200 text-purple-900 bg-purple-50 hover:bg-purple-100 gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-purple-600" /> Extrato de Transações (Audit)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompanyMaterialsModalOpen(true)}
                    className="text-xs font-bold border-purple-200 text-purple-800 hover:bg-purple-50"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Material Items
                  </Button>
                </div>
              </div>

              {/* Partner Totals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                    {partnerAccountingSummary.hugoName} Paid
                  </span>
                  <p className="text-xl font-black text-blue-950">${partnerAccountingSummary.hugoPaid.toFixed(2)}</p>
                  <p className="text-[10px] text-blue-700 font-medium">Cartão pessoal avançado</p>
                </div>
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">
                    {partnerAccountingSummary.partner2Name} Paid
                  </span>
                  <p className="text-xl font-black text-purple-950">${partnerAccountingSummary.partner2Paid.toFixed(2)}</p>
                  <p className="text-[10px] text-purple-700 font-medium">Cartão pessoal avançado</p>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">Company Card/Account</span>
                  <p className="text-xl font-black text-slate-900">${partnerAccountingSummary.companyCardPaid.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Cartão direto da empresa (Sem dívida)</p>
                </div>
              </div>

              {/* Partner Settlement Status & Baixa Action */}
              <div className="pt-2">
                {partnerAccountingSummary.netOwedAmount > 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5 cursor-pointer" onClick={() => setIsPartnerAuditModalOpen(true)}>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">
                          Pending Partner Settlement
                        </Badge>
                        <span className="text-xs font-bold text-amber-950">
                          {partnerAccountingSummary.netOwedFrom} owes {partnerAccountingSummary.netOwedTo}:
                        </span>
                        <span className="text-base font-black text-amber-900">${partnerAccountingSummary.netOwedAmount.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium hover:underline flex items-center gap-1">
                        🔍 Clique aqui para ver o extrato de transações completo de onde surgiu este valor.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPartnerAuditModalOpen(true)}
                        className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-bold text-xs h-9 gap-1"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-700" /> Ver Extrato
                      </Button>
                      <Button
                        onClick={() => {
                          setSettlementForm({
                            payerName: partnerAccountingSummary.netOwedFrom,
                            receiverName: partnerAccountingSummary.netOwedTo,
                            amount: partnerAccountingSummary.netOwedAmount.toFixed(2),
                            date: new Date().toISOString().slice(0, 10),
                            paymentMethod: "zelle",
                            notes: ""
                          });
                          setIsPartnerSettlementOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 h-9 shadow-sm shrink-0 gap-1.5"
                      >
                        <DollarSign className="h-4 w-4" /> Registrar Baixa / Pay Partner
                      </Button>
                    </div>
                  </div>
                ) : partnerAccountingSummary.totalCompanyCost > 0 ? (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Partner Materials 100% Equalized &amp; Settled (Baixa Efetuada)</span>
                    </div>
                    {partnerAccountingSummary.settlementRecords.length > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {partnerAccountingSummary.settlementRecords.length} Settlement(s) Logged
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No internal company material expenses recorded for this job yet.</p>
                )}
              </div>
            </div>

            {/* Recent Change Orders Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0b2a4a] text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-600" /> Change Orders / Service Extras ({extras.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("extras")} className="text-xs text-blue-600">
                  View All Extras →
                </Button>
              </div>

              {extras.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No Change Orders registered for this job yet.</p>
              ) : (
                <div className="grid gap-3">
                  {extras.slice(0, 3).map(extra => (
                    <div key={extra.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-gray-900">{extra.description}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{new Date(extra.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-gray-900">${extra.amount.toLocaleString()}</span>
                        <span className={`block text-[9px] font-bold uppercase ${extra.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {extra.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONTRACT / ESTIMATE */}
        {activeTab === "contract" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base">Commercial Proposal & Contract</h3>
                  <p className="text-xs text-gray-500">Commercial terms frozen upon client signature approval.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={isGeneratingPDF} className="h-9 text-xs font-bold">
                    <Printer className="h-3.5 w-3.5 mr-1" /> Download PDF
                  </Button>
                  <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-bold h-9 px-3 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">
                    <Upload className="h-3.5 w-3.5 mr-1 text-emerald-700" /> Upload Signed Contract (PDF/Photo)
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleSignedDocUpload} />
                  </label>
                  {estimate?.status === 'Approved' && (
                    <Button variant="outline" size="sm" onClick={() => setIsCountersignOpen(true)} className="h-9 text-xs font-bold border-purple-200 text-purple-700">
                      <PenTool className="h-3.5 w-3.5 mr-1" /> Countersign Contract
                    </Button>
                  )}
                </div>
              </div>

              {estimate ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Status</span>
                      <p className="font-bold text-emerald-600">{estimate.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Date Created</span>
                      <p className="font-semibold text-gray-900">{new Date(estimate.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Valid Until</span>
                      <p className="font-semibold text-gray-900">{estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Public Share Link</span>
                      <button
                        onClick={() => {
                          const targetTk = estimate.public_token || estimate.id;
                          navigator.clipboard.writeText(`${window.location.origin}/estimate/${targetTk}`);
                          toast.success("Client Project Portal link copied!");
                        }}
                        className="font-bold text-blue-600 hover:underline block"
                      >
                        Copy Client Link
                      </button>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-3">Line Items Breakdown</h4>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase">
                          <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3">Qty</th>
                            <th className="p-3">Unit Price</th>
                            <th className="p-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(estimate.items || []).map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-3 font-semibold text-gray-900">{item.description}</td>
                              <td className="p-3 text-gray-600">{item.quantity}</td>
                              <td className="p-3 text-gray-600">${(item.unit_price || 0).toFixed(2)}</td>
                              <td className="p-3 text-right font-bold text-gray-900">${(item.total_price || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No Estimate record attached.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base">Job Execution Schedule</h3>
                  <p className="text-xs text-gray-500">Track site appointment dates, worker assignments, and milestones.</p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === "scheduled" && (
                    <Button onClick={() => handleUpdateJobStatus("in_progress")} size="sm" className="bg-blue-600 text-white font-bold text-xs">
                      Start Execution
                    </Button>
                  )}
                  {job.status === "in_progress" && (
                    <Button onClick={() => handleUpdateJobStatus("completed")} size="sm" className="bg-emerald-600 text-white font-bold text-xs">
                      Complete Job
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-gray-500 uppercase block mb-1">Scheduled Start Date</label>
                    <p className="text-sm font-semibold text-gray-900">{job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : "Pending Schedule"}</p>
                  </div>
                  <div>
                    <label className="font-bold text-gray-500 uppercase block mb-1">Actual Execution Started</label>
                    <p className="text-sm font-semibold text-gray-900">{job.started_at ? new Date(job.started_at).toLocaleString() : "Not started yet"}</p>
                  </div>
                  <div>
                    <label className="font-bold text-gray-500 uppercase block mb-1">Target Completion</label>
                    <p className="text-sm font-semibold text-gray-900">{job.completed_at ? new Date(job.completed_at).toLocaleString() : "In Progress"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-gray-500 uppercase block mb-1">Assigned Operational Worker</label>
                    <p className="text-sm font-semibold text-gray-900">{job.assigned_worker_id ? `Worker #${job.assigned_worker_id.slice(0, 8)}` : "Unassigned (Manager Supervised)"}</p>
                  </div>
                  <div>
                    <label className="font-bold text-gray-500 uppercase block mb-1">Property Address Released to Worker</label>
                    <Badge className={job.address_released_to_worker ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}>
                      {job.address_released_to_worker ? "Released" : "Restricted"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base">Client Payments & Receipts</h3>
                  <p className="text-xs text-gray-500">Record customer payments and issue digital receipts for this job.</p>
                </div>
                <Button onClick={() => setIsRegisterPaymentOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9">
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Register Payment
                </Button>
              </div>

              {payments.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No payments recorded for this job yet.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Notes / Reference</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {payments.map(payment => {
                        const isPendingValidation = payment.status === 'draft' || (payment.status as string) === 'pending_validation';
                        const isCancelled = payment.status === 'cancelled';
                        const isReceived = payment.status === 'received';

                        return (
                          <tr key={payment.id} className={isPendingValidation ? "bg-amber-50/60" : isCancelled ? "bg-red-50/40" : ""}>
                            <td className="p-3 font-semibold text-gray-900">{new Date(payment.payment_date || payment.created_at).toLocaleDateString()}</td>
                            <td className="p-3 uppercase text-gray-700">{payment.method}</td>
                            <td className="p-3 text-gray-500 max-w-xs truncate">{payment.note || "Payment received"}</td>
                            <td className="p-3">
                              {isReceived && <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">Validado (Recebido)</Badge>}
                              {isPendingValidation && <Badge className="bg-amber-100 text-amber-800 font-bold text-[10px]">Aguardando Validação</Badge>}
                              {isCancelled && <Badge className="bg-red-100 text-red-800 font-bold text-[10px]">Cancelado / Rejeitado</Badge>}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700 text-sm">${payment.amount.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isPendingValidation && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setPaymentToValidate(payment);
                                        setValidationAction('approve');
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7 px-2 shadow-xs"
                                    >
                                      ✓ Validar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setPaymentToValidate(payment);
                                        setValidationAction('reject');
                                      }}
                                      className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[10px] h-7 px-2 shadow-xs"
                                    >
                                      ✕ Rejeitar
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEditClientPayment(payment)}
                                  className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                  title="Alterar Pagamento"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClientPayment(payment.id)}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Excluir Pagamento"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: EXTRAS / CHANGE ORDERS */}
        {activeTab === "extras" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base">Change Orders / Service Extras</h3>
                  <p className="text-xs text-gray-500">Add scope adjustments, unforeseen repairs, or customer upgrades.</p>
                </div>
                <Button onClick={() => setIsAddExtraOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9">
                  <Plus className="h-3.5 w-3.5 mr-1" /> + Add Change Order
                </Button>
              </div>

              {extras.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No Change Orders added for this job.</p>
              ) : (
                <div className="grid gap-4">
                  {extras.map(extra => {
                    const { cleanText: cleanReasonText, mediaUrls: extraPhotos } = extractMediaFromText(extra.reason);
                    const { cleanText: cleanDescText } = extractMediaFromText(extra.description);
                    return (
                      <div key={extra.id} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-gray-900">{cleanDescText}</p>
                            {cleanReasonText && <p className="text-xs text-gray-500 mt-0.5">Reason: {cleanReasonText}</p>}
                          </div>
                          <span className="font-bold text-base text-purple-700">+${extra.amount.toLocaleString()}</span>
                        </div>

                        {extraPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                            {extraPhotos.map((url, idx) => (
                              <div key={idx} className="relative aspect-square w-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer" onClick={() => setSelectedMediaUrl(url)}>
                                <img src={url} alt="Extra photo attachment" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200 text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            extra.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {extra.status}
                          </span>
                          {extra.schedule_impact && <span className="text-gray-500 font-medium">Impact: {extra.schedule_impact}</span>}
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenItemDetail(extra, 'extra')}
                            className="h-7 text-xs font-bold text-purple-700 hover:bg-purple-100 gap-1 px-2 rounded-lg"
                            title="Ver Detalhes Ampliados e Fotos"
                          >
                            <Eye className="h-3.5 w-3.5" /> Ver Detalhes
                          </Button>

                          {(extra.public_token || estimate?.public_token) && (
                            <button
                              onClick={() => handleCopyExtraLink(extra)}
                              className="font-bold text-blue-600 hover:underline"
                            >
                              Copy Client Approval Link
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PHOTOS & VIDEOS */}
        {activeTab === "media" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base">Job Site Photos &amp; Video Documentation</h3>
                  <p className="text-xs text-gray-500">Manage progress photos, client visibility, and public portfolio candidates.</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Media Filter buttons */}
                  <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs">
                    {(["all", "client", "admin", "portfolio"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setMediaFilter(f)}
                        className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                          mediaFilter === f ? "bg-white text-blue-900 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => setIsAddMediaOpen(true)} className="bg-[#0b2a4a] text-white font-bold text-xs h-9">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Photo
                  </Button>
                </div>
              </div>

              {filteredMedia.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No photos uploaded matching current filter.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredMedia.map(m => {
                    const mediaState = mediaSignedUrls[m.id];
                    const mediaUrl = mediaState?.url || "";
                    const isMissing = mediaState?.isMissing || false;

                    const portfolioStatus = m.portfolio_approved
                      ? 'Approved'
                      : m.visible_on_public_site
                      ? 'Pending Review'
                      : 'Not Submitted';

                    return (
                      <div key={m.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col group">
                        <div
                          className="aspect-video relative overflow-hidden bg-slate-900 flex items-center justify-center cursor-pointer"
                          onClick={() => {
                            if (!isMissing && mediaUrl) setLightboxMedia(m);
                          }}
                        >
                          {isMissing ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 text-center text-slate-400">
                              <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                              <span className="font-bold text-xs text-amber-400">File Missing in Storage</span>
                              <span className="text-[10px] text-slate-500 mt-1 truncate max-w-full">{m.file_name || m.storage_path}</span>
                            </div>
                          ) : m.media_type === 'video' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white bg-slate-950/80">
                              <video src={mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                                <span className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase flex items-center gap-1">▶ Play Video</span>
                              </span>
                            </div>
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={m.caption || "Job photo"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={() => {
                                setMediaSignedUrls(prev => ({
                                  ...prev,
                                  [m.id]: { url: "", isMissing: true }
                                }));
                              }}
                            />
                          )}
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                            {m.visible_to_client ? (
                              <Badge className="bg-emerald-500/90 text-white text-[9px] px-1.5 py-0.5">
                                <Eye className="h-3 w-3 mr-1" /> Client Visible
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-700/90 text-white text-[9px] px-1.5 py-0.5">
                                <EyeOff className="h-3 w-3 mr-1" /> Admin Only
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
                          <div>
                            <p className="font-bold text-gray-900">{m.caption || "Job progress documentation"}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Portfolio Status: <span className="font-bold text-purple-700">{portfolioStatus}</span></p>
                          </div>

                          {isMissing ? (
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                              <label className="cursor-pointer text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200 hover:bg-amber-100">
                                Replace File
                                <input
                                  type="file"
                                  accept={m.media_type === 'video' ? 'video/*' : 'image/*'}
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const relativePath = `${orgId}/jobs/${job.id}/${m.media_type === 'video' ? 'videos' : 'photos'}/${Date.now()}_${file.name}`;
                                      let bucket = 'images';
                                      const { error: err1 } = await supabase.storage.from('images').upload(relativePath, file, { upsert: true });
                                      if (err1) {
                                        bucket = 'documents';
                                        await supabase.storage.from('documents').upload(relativePath, file, { upsert: true });
                                      }
                                      const newPath = `${bucket}/${relativePath}`;
                                      await supabase.from('service_job_media').update({ storage_path: newPath }).eq('id', m.id);
                                      toast.success("Media file replaced!");
                                      const updatedList = media.map(item => item.id === m.id ? { ...item, storage_path: newPath } : item);
                                      setMedia(updatedList);
                                      await loadMediaSignedUrls(updatedList);
                                    } catch (err: any) {
                                      toast.error("Failed to replace media file.");
                                    }
                                  }}
                                />
                              </label>
                              <button
                                onClick={() => handleDeleteMediaRecord(m.id)}
                                className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100"
                              >
                                Delete Record
                              </button>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1 text-[10px]">
                              <button
                                onClick={() => handleToggleMediaVisibility(m.id, "client")}
                                className={`px-2 py-0.5 rounded border font-semibold ${m.visible_to_client ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'}`}
                              >
                                Client: {m.visible_to_client ? 'ON' : 'OFF'}
                              </button>
                              <button
                                onClick={() => handleToggleMediaVisibility(m.id, "public")}
                                className={`px-2 py-0.5 rounded border font-semibold ${m.visible_on_public_site ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}
                              >
                                Public Candidate: {m.visible_on_public_site ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: MATERIALS / EXPENSES */}
        {activeTab === "materials" && (
          <div className="space-y-6 animate-in fade-in">
            {/* CLIENT MATERIALS SECTION (Requirement 20 - 23) */}
            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                <div>
                  <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-amber-600" />
                    Client Materials & Reimbursables (Billed to Client)
                  </h3>
                  <p className="text-xs text-amber-700">Materials purchased for job to be reimbursed by customer. Increases Total Client Responsibility.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-900 font-bold text-xs px-3 py-1">
                    Total: ${financialSummary.clientMaterials.toLocaleString()}
                  </Badge>
                  <Button onClick={handleOpenAddClientExpense} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9">
                    <Plus className="h-3.5 w-3.5 mr-1" /> + Add Client Material
                  </Button>
                </div>
              </div>

              {/* Partner Breakdown for Client Materials (Requirement: Show total spent per partner for client materials) */}
              {clientMaterialsByPartner.length > 0 && (
                <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 font-semibold text-amber-950">
                    <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <User className="h-4 w-4 text-amber-600" /> Total Pago por Sócio em Materiais do Cliente:
                    </span>
                    {clientMaterialsByPartner.map(p => (
                      <div key={p.partnerName} className="bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-2xs flex items-center gap-2">
                        <span className="text-gray-700">{p.partnerName}:</span>
                        <span className="font-black text-amber-900 text-sm">${p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expenses.filter(e => e.bill_to_client).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No client-billed materials logged for this job yet.</p>
              ) : (
                <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/20">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-100/60 border-b border-amber-200 font-bold text-amber-900 uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Who Paid</th>
                        <th className="p-3">Payment Status</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/80">
                      {expenses.filter(e => e.bill_to_client).map(mat => (
                        <tr key={mat.id}>
                          <td className="p-3 font-semibold text-gray-900">{new Date(mat.receipt_date).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-gray-900">{mat.vendor}</td>
                          <td className="p-3 text-gray-600">{mat.paid_by_name || "Company Account"}</td>
                          <td className="p-3">
                            <Badge className={mat.client_reimbursement_status === 'paid' ? "bg-emerald-100 text-emerald-800 font-bold text-[10px]" : "bg-amber-100 text-amber-800 font-bold text-[10px]"}>
                              {mat.client_reimbursement_status === 'paid' ? "Paid by Client" : "Billed to Client"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-amber-900 text-sm">${mat.amount.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenItemDetail(mat, 'client_material')}
                                className="h-7 w-7 p-0 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                                title="Ver Detalhes e Comprovante"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditExpense(mat)}
                                className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit Material"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteExpense(mat.id)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Material"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* COMPANY MATERIALS SECTION (Requirement 26 - 28) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    Company Materials & Job Costs (Internal Only — Hidden from Client)
                  </h3>
                  <p className="text-xs text-gray-500">Internal company job expenses used for job cost profitability & partner accounting.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-900 font-bold text-xs px-3 py-1">
                    Company Job Cost: ${financialSummary.companyMaterialsCost.toLocaleString()}
                  </Badge>
                  <Button
                    onClick={() => {
                      setSettlementForm({
                        payerName: partnerAccountingSummary.netOwedFrom || "Hugo Luiz Ferreira dos Santos",
                        receiverName: partnerAccountingSummary.netOwedTo || "Adelmo Ferreira dos Santos",
                        amount: partnerAccountingSummary.netOwedAmount > 0 ? partnerAccountingSummary.netOwedAmount.toFixed(2) : "",
                        date: new Date().toISOString().slice(0, 10),
                        paymentMethod: "zelle",
                        notes: ""
                      });
                      setIsPartnerSettlementOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 shadow-sm gap-1.5"
                  >
                    <DollarSign className="h-4 w-4" /> Registrar Baixa entre Sócios
                  </Button>
                  <Button onClick={handleOpenAddCompanyExpense} className="bg-[#0b2a4a] text-white font-bold text-xs h-9">
                    <Plus className="h-3.5 w-3.5 mr-1" /> + Add Company Material
                  </Button>
                </div>
              </div>

              {/* Partner Equalization Summary Box inside Materials Tab */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-gray-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                      Avançado por {partnerAccountingSummary.hugoName}
                    </span>
                    <p className="text-xl font-black text-blue-950">${partnerAccountingSummary.hugoPaid.toFixed(2)}</p>
                    <p className="text-[10px] text-blue-700 font-medium">{partnerAccountingSummary.hugoOutofPocketExpenses.length} nota(s) pessoal(is)</p>
                  </div>
                  <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">
                      Avançado por {partnerAccountingSummary.partner2Name}
                    </span>
                    <p className="text-xl font-black text-purple-950">${partnerAccountingSummary.partner2Paid.toFixed(2)}</p>
                    <p className="text-[10px] text-purple-700 font-medium">{partnerAccountingSummary.partner2OutofPocketExpenses.length} nota(s) pessoal(is)</p>
                  </div>
                  <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-300 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">Company Card / Account</span>
                    <p className="text-xl font-black text-slate-900">${partnerAccountingSummary.companyCardPaid.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Direto da Empresa (Sem Reembolso)</p>
                  </div>
                </div>

                <div className="pt-1">
                  {partnerAccountingSummary.netOwedAmount > 0 ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 cursor-pointer" onClick={() => setIsPartnerAuditModalOpen(true)}>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">
                            Pendência entre Sócios
                          </Badge>
                          <span className="text-xs font-bold text-amber-950">
                            {partnerAccountingSummary.netOwedFrom} deve a {partnerAccountingSummary.netOwedTo}:
                          </span>
                          <span className="text-base font-black text-amber-900">${partnerAccountingSummary.netOwedAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 font-medium hover:underline flex items-center gap-1">
                          🔍 Clique para abrir o extrato detalhado de auditoria.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPartnerAuditModalOpen(true)}
                        className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100 font-bold text-xs h-8 gap-1 self-start sm:self-auto"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-700" /> Ver Extrato
                      </Button>
                    </div>
                  ) : partnerAccountingSummary.totalCompanyCost > 0 ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Saldos e Baixas entre Sócios 100% Quitados</span>
                      </div>
                      {partnerAccountingSummary.settlementRecords.length > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {partnerAccountingSummary.settlementRecords.length} Quitação(ões) Registrada(s)
                        </Badge>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {sortedCompanyExpenses.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No internal company materials logged for this job.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Who Paid</th>
                        <th className="p-3">Economic Allocation (50/50)</th>
                        <th className="p-3 text-right">Net Amount</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {sortedCompanyExpenses.map(exp => {
                        const halfAmount = exp.amount / 2;
                        const paidByName = exp.paid_by_name || "Company Card / Account";
                        const isSettlement = isPartnerSettlement(exp);

                        const isCompanyCard = exp.payment_source === 'company_account' ||
                          exp.payment_source === 'company_card' ||
                          exp.paid_by_name === 'Company Card' ||
                          exp.paid_by_name === 'Company Card / Account' ||
                          !exp.paid_by_name ||
                          exp.paid_by_name.toLowerCase().includes('company');

                        return (
                          <Fragment key={exp.id}>
                            <tr className={isSettlement ? "bg-emerald-50/90 hover:bg-emerald-100/90 border-b border-emerald-200 transition-colors" : ""}>
                              <td className="p-3 font-semibold text-gray-900">{new Date(exp.receipt_date).toLocaleDateString()}</td>
                              <td className="p-3 font-bold text-gray-900 flex items-center gap-1.5">
                                {isSettlement && <Badge className="bg-emerald-600 text-white font-bold text-[9px] uppercase">Pagamento entre Sócios</Badge>}
                                <span>{exp.vendor}</span>
                              </td>
                              <td className="p-3 text-purple-700 font-bold">{paidByName}</td>
                              <td className="p-3 text-gray-600 text-[11px]">
                                {isSettlement ? (
                                  <span className="text-emerald-800 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Liquidado / Pagamento entre Sócios (100% Baixa)
                                  </span>
                                ) : isCompanyCard ? (
                                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                                    💳 Cartão / Conta da Empresa (${exp.amount.toFixed(2)}) — Sem reembolso de sócios
                                  </span>
                                ) : (
                                  <span className="font-mono">{paidByName}: ${exp.amount.toFixed(2)} adiantado ({partnerAccountingSummary.hugoName}: ${halfAmount.toFixed(2)} / {partnerAccountingSummary.partner2Name}: ${halfAmount.toFixed(2)})</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-bold text-gray-900 text-sm">${exp.amount.toLocaleString()}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenItemDetail(exp, isSettlement ? 'partner_settlement' : 'company_material')}
                                    className="h-7 w-7 p-0 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
                                    title="Ver Detalhes e Comprovante"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEditExpense(exp)}
                                    className="h-7 w-7 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                    title="Edit Material"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete Material"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>

                            {isSettlement && (
                              <tr key={`equalization-${exp.id}`} className="bg-emerald-100/90 border-y-2 border-emerald-500">
                                <td colSpan={6} className="p-2.5 text-center text-xs font-bold text-emerald-950 shadow-inner">
                                  <div className="flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                    <span>🟢 QUITAÇÃO EFETUADA EM {new Date(exp.receipt_date).toLocaleDateString()} — TODAS AS DESPESAS ANTERIORES (ABAIXO DESTA LINHA) FORAM DEVIDAMENTE SALDADAS ENTRE OS SÓCIOS</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: REIMBURSEMENTS */}
        {activeTab === "reimbursements" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-[#0b2a4a] text-base">Owner &amp; Partner Reimbursements</h3>
                  <p className="text-xs text-gray-500">Track out-of-pocket expenses owed for this specific job.</p>
                </div>
              </div>

              {expenses.filter(e => e.reimbursable_to_owner).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No pending or paid owner reimbursements for this job.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vendor</th>
                        <th className="p-3">Owed To</th>
                        <th className="p-3">Reimbursement Status</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenses.filter(e => e.reimbursable_to_owner).map(expense => (
                        <tr key={expense.id}>
                          <td className="p-3 font-semibold text-gray-900">{new Date(expense.receipt_date).toLocaleDateString()}</td>
                          <td className="p-3 text-gray-900 font-medium">{expense.vendor}</td>
                          <td className="p-3 text-gray-700">{expense.paid_by_name || "Owner"}</td>
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const newStatus = expense.reimbursement_status === "paid" ? "pending" : "paid";
                                await updateExpense(expense.id, { reimbursement_status: newStatus });
                                setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, reimbursement_status: newStatus } : e));
                                toast.success(`Reimbursement marked as ${newStatus}!`);
                              }}
                              className="h-7 text-[10px] font-bold"
                            >
                              {expense.reimbursement_status}
                            </Button>
                          </td>
                          <td className="p-3 text-right font-bold text-amber-700 text-sm">${expense.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-bold text-[#0b2a4a] text-base">Project Documents &amp; Executed Artifacts</h3>
                <p className="text-xs text-gray-500">Centralized storage for signed PDFs, receipts, and change order files.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                {estimate && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-bold text-gray-900">Commercial Proposal PDF</p>
                        <p className="text-[10px] text-gray-500">Estimate #{estimate.id.split("-")[0].toUpperCase()}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="h-8 text-xs font-bold">
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-bold text-[#0b2a4a] text-base">Real Activity Audit Log</h3>
                <p className="text-xs text-gray-500">Authentic timeline of commercial approvals, payments, and site updates.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">1</div>
                  <div>
                    <p className="font-bold text-gray-900">Job Created</p>
                    <p className="text-[10px] text-gray-500">{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {payments.map(p => (
                  <div key={p.id} className="flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">$</div>
                    <div>
                      <p className="font-bold text-gray-900">Payment Received (${p.amount.toLocaleString()})</p>
                      <p className="text-[10px] text-gray-500">{new Date(p.payment_date).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS WITH PRE-FILLED LOCKED CONTEXT (Requirement 6, 7, 10) */}
      {/* 1. Register Payment Modal */}
      {estimate && (
        <RegisterPaymentModal
          isOpen={isRegisterPaymentOpen}
          onClose={() => setIsRegisterPaymentOpen(false)}
          estimateId={estimate.id}
          organizationId={orgId}
          remainingBalance={financialSummary.balanceDue}
          onSuccess={() => loadJobWorkspace()}
        />
      )}

      {/* 2. Countersign Modal */}
      {estimate && (
        <CountersignModal
          isOpen={isCountersignOpen}
          onClose={() => setIsCountersignOpen(false)}
          estimate={estimate}
          companySettings={companySettings}
          onCountersigned={() => loadJobWorkspace()}
        />
      )}

      {/* 3. Add Extra / Change Order Modal */}
      {isAddExtraOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#0b2a4a]">New Change Order / Service Extra</h3>

            <div className="space-y-3 text-xs">
              <div>
                <Label>Previous Contract Price (Auto)</Label>
                <Input value={`$${financialSummary.currentContractValue.toLocaleString()}`} disabled className="bg-gray-100 font-bold" />
              </div>
              <div>
                <Label>Description / Scope</Label>
                <Input
                  placeholder="e.g. Replace damaged framing joists"
                  value={extraForm.description}
                  onChange={e => setExtraForm({ ...extraForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  placeholder="e.g. Unforeseen structural decay under subfloor"
                  value={extraForm.reason}
                  onChange={e => setExtraForm({ ...extraForm, reason: e.target.value })}
                />
              </div>
              <div>
                <Label>Extra Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 750"
                  value={extraForm.amount}
                  onChange={e => setExtraForm({ ...extraForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Schedule Impact</Label>
                <Input
                  placeholder="e.g. 2 additional days"
                  value={extraForm.scheduleImpact}
                  onChange={e => setExtraForm({ ...extraForm, scheduleImpact: e.target.value })}
                />
              </div>

              {/* Restored Photo & Video Attachments for Change Order */}
              <div className="space-y-2 pt-2 border-t border-purple-100">
                <Label className="font-bold text-gray-700 block text-xs">Attach Extra Photo or Video</Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200 text-[11px] hover:bg-purple-100">
                    📷 Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setExtraSelectedFiles(prev => [...prev, file]);
                      }}
                    />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200 text-[11px] hover:bg-purple-100">
                    🖼️ Choose Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setExtraSelectedFiles(prev => [...prev, file]);
                      }}
                    />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200 text-[11px] hover:bg-purple-100">
                    📹 Record Video
                    <input
                      type="file"
                      accept="video/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setExtraSelectedFiles(prev => [...prev, file]);
                      }}
                    />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200 text-[11px] hover:bg-purple-100">
                    🎥 Choose Video
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setExtraSelectedFiles(prev => [...prev, file]);
                      }}
                    />
                  </label>
                </div>

                {extraSelectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {extraSelectedFiles.map((file, idx) => (
                      <div key={idx} className="relative bg-purple-100 px-2 py-1 rounded-lg text-[10px] font-bold text-purple-900 flex items-center gap-1">
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setExtraSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 font-bold hover:text-red-700 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {extraForm.amount && (
                <div className="p-3 bg-purple-50 rounded-xl text-purple-900 font-bold">
                  Revised Contract Price: ${(financialSummary.currentContractValue + (parseFloat(extraForm.amount) || 0)).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddExtraOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExtraSubmit} disabled={isSavingExtra} className="bg-purple-600 text-white font-bold size-sm">
                {isSavingExtra ? "Saving..." : "Save Change Order"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Material Expense Modal (Requirement 12 & 13) */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-base text-[#0b2a4a] border-b border-gray-100 pb-2">Log Job Material / Expense</h3>

            <div className="space-y-4 text-xs">
              {/* Material Responsibility Selection (Requirement 12) */}
              <div>
                <Label className="font-bold text-gray-700 block mb-1.5">Who is responsible for this material?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExpenseForm(prev => ({ ...prev, billToClient: true, reimbursableToOwner: false }))}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      expenseForm.billToClient
                        ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <p className="text-xs">Client Material</p>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">Billed to client / increases Client Responsibility</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseForm(prev => ({ ...prev, billToClient: false, reimbursableToOwner: true }))}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      !expenseForm.billToClient
                        ? "bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <p className="text-xs">Company Material</p>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">Company job cost / does not increase client price</p>
                  </button>
                </div>
              </div>

              <div>
                <Label>Description / Item</Label>
                <Input
                  placeholder="e.g. 2x4 Pressure Treated Lumber & Screws"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Vendor / Store</Label>
                <Input
                  placeholder="e.g. Home Depot / Ring's End"
                  value={expenseForm.vendor}
                  onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 340.50"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Receipt Date</Label>
                <Input
                  type="date"
                  value={expenseForm.receiptDate}
                  onChange={e => setExpenseForm({ ...expenseForm, receiptDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="font-bold text-gray-700 block mb-1">Who Paid (Payment Source)</Label>
                <select
                  value={expenseForm.paidByName}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "Company Card" || val === "Company Card / Account") {
                      setExpenseForm({
                        ...expenseForm,
                        paidByName: "Company Card / Account",
                        paymentSource: "company_card",
                        reimbursableToOwner: false
                      });
                    } else if (val === "Customer Paid Direct") {
                      setExpenseForm({
                        ...expenseForm,
                        paidByName: val,
                        paymentSource: "customer_paid_direct",
                        reimbursableToOwner: false
                      });
                    } else {
                      setExpenseForm({
                        ...expenseForm,
                        paidByName: val,
                        paymentSource: "partner_personal",
                        reimbursableToOwner: !expenseForm.billToClient
                      });
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Company Card / Account">💳 Company Card / Corporate Account</option>
                  {partners.filter(p => p.active !== false).map(p => (
                    <option key={p.id} value={p.name}>
                      👤 {p.name} (Partner Personal Card / Cash)
                    </option>
                  ))}
                  <option value="Customer Paid Direct">💵 Customer Paid Direct</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Mobile-First Receipt Photo Capture (Requirement 13 & 28) */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Label className="font-bold text-gray-700 block">Comprovante / Recibo do Material (Foto / PDF)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 text-[11px] hover:bg-blue-100">
                    📷 Tirar Foto (Câmera)
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                      if (e.target.files?.[0]) setExpenseSelectedFile(e.target.files[0]);
                    }} />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 text-[11px] hover:bg-gray-100">
                    🖼️ Carregar Imagem / PDF
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => {
                      if (e.target.files?.[0]) setExpenseSelectedFile(e.target.files[0]);
                    }} />
                  </label>
                </div>

                {expenseSelectedFile && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-between shadow-xs">
                    <span className="truncate max-w-[240px]">📎 Recibo Anexado: {expenseSelectedFile.name}</span>
                    <button type="button" onClick={() => setExpenseSelectedFile(null)} className="text-red-500 font-bold hover:text-red-700 ml-2">✕</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExpenseSubmit} disabled={isSavingExpense} className="bg-[#0b2a4a] text-white font-bold size-sm">
                {isSavingExpense ? "Saving..." : "Save Material"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Job Photo / Video Modal (Requirement 7 & 8) */}
      {isAddMediaOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-[#0b2a4a]">Upload Job Photo / Video</h3>

            <div className="space-y-3 text-xs">
              <Label className="font-bold text-gray-700 block">Select Media File (Mobile Options)</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer flex items-center justify-center gap-1.5 p-3 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 text-xs hover:bg-blue-100 text-center">
                  📷 Take Photo
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMediaFileSelect} />
                </label>
                <label className="cursor-pointer flex items-center justify-center gap-1.5 p-3 bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs hover:bg-slate-100 text-center">
                  🖼️ Choose Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleMediaFileSelect} />
                </label>
                <label className="cursor-pointer flex items-center justify-center gap-1.5 p-3 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200 text-xs hover:bg-purple-100 text-center">
                  🎥 Record Video
                  <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleMediaFileSelect} />
                </label>
                <label className="cursor-pointer flex items-center justify-center gap-1.5 p-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-200 text-xs hover:bg-indigo-100 text-center">
                  🎬 Choose Video
                  <input type="file" accept="video/*" className="hidden" onChange={handleMediaFileSelect} />
                </label>
              </div>

              {mediaFileUrl && (
                <div className="w-28 h-28 rounded-xl overflow-hidden border border-gray-200 mt-2">
                  <img src={mediaFileUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <Label>Caption / Notes</Label>
                <Input
                  placeholder="e.g. Gutter repair completed & water tested"
                  value={mediaCaption}
                  onChange={e => setMediaCaption(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddMediaOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMediaSubmit} disabled={isSavingMedia || !mediaFileUrl} className="bg-[#0b2a4a] text-white font-bold size-sm">
                {isSavingMedia ? "Uploading..." : "Upload Media"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Confirm Offline Signed Contract Modal (Security Rule 5 & 6) */}
      {isOfflineUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2a4a] flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Confirm Offline Signed Contract
              </h3>
              <button onClick={() => setIsOfflineUploadOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium">
                📄 Attachment: <span className="font-bold">{offlineForm.file?.name || "Signed_Contract.pdf"}</span> ({( (offlineForm.file?.size || 0) / 1024 ).toFixed(1)} KB)
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer font-bold text-gray-900">
                  <input
                    type="checkbox"
                    checked={offlineForm.signedByClient}
                    onChange={e => setOfflineForm({ ...offlineForm, signedByClient: e.target.checked })}
                    className="h-4 w-4 text-emerald-600 rounded"
                  />
                  <span>Signed by Client (Physical Paper Signature Verified)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Client Legal Name</Label>
                  <Input
                    value={offlineForm.clientLegalName}
                    onChange={e => setOfflineForm({ ...offlineForm, clientLegalName: e.target.value })}
                    placeholder="Full Legal Name"
                  />
                </div>
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Signed Date</Label>
                  <Input
                    type="date"
                    value={offlineForm.signedDate}
                    onChange={e => setOfflineForm({ ...offlineForm, signedDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Uploaded By</Label>
                  <Input
                    value={offlineForm.uploadedBy}
                    onChange={e => setOfflineForm({ ...offlineForm, uploadedBy: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Document Version</Label>
                  <Input value={`Estimate ${estimate?.id ? estimate.id.split('-')[0].toUpperCase() : 'v1'}`} disabled className="bg-gray-100" />
                </div>
              </div>

              <div>
                <Label className="font-bold text-gray-700 block mb-1">Audit Notes / Notes</Label>
                <textarea
                  rows={2}
                  value={offlineForm.notes}
                  onChange={e => setOfflineForm({ ...offlineForm, notes: e.target.value })}
                  placeholder="e.g. Physical paper contract signed during site visit & scanned."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsOfflineUploadOpen(false)}>Cancel</Button>
              <Button
                onClick={handleConfirmOfflineSignedContract}
                disabled={isSubmittingOfflineDoc || !offlineForm.signedByClient}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {isSubmittingOfflineDoc ? "Confirming & Approving..." : "Confirm Signed Contract"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Media Lightbox Modal */}
      {lightboxMedia && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="flex items-center gap-3">
                <Badge className="bg-white/20 text-white text-xs uppercase capitalize">
                  {lightboxMedia.media_type}
                </Badge>
                <h3 className="font-bold text-sm truncate max-w-xs sm:max-w-md">{lightboxMedia.caption || "Job Media Documentation"}</h3>
              </div>
              <button
                onClick={() => setLightboxMedia(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] overflow-hidden p-2">
              {filteredMedia.length > 1 && (
                <button
                  onClick={handlePrevLightbox}
                  disabled={lightboxIndex <= 0}
                  className="absolute left-4 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center disabled:opacity-30 font-bold transition-all"
                >
                  ❮
                </button>
              )}

              {lightboxMedia.media_type === 'video' ? (
                <video
                  src={mediaSignedUrls[lightboxMedia.id]?.url || lightboxMedia.storage_path}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-auto max-w-full rounded-xl"
                />
              ) : (
                <img
                  src={mediaSignedUrls[lightboxMedia.id]?.url || lightboxMedia.storage_path}
                  alt={lightboxMedia.caption || "Job photo"}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
                />
              )}

              {filteredMedia.length > 1 && (
                <button
                  onClick={handleNextLightbox}
                  disabled={lightboxIndex >= filteredMedia.length - 1}
                  className="absolute right-4 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center disabled:opacity-30 font-bold transition-all"
                >
                  ❯
                </button>
              )}
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-between border-t border-slate-800 text-xs text-slate-300">
              <p className="italic">Uploaded: {new Date(lightboxMedia.created_at).toLocaleDateString()}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setLightboxMedia(null)} className="h-8 text-xs font-bold border-slate-700 text-slate-200 hover:bg-slate-800">
                  Close Lightbox
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTNER SETTLEMENT MODAL (FAZER BAIXA DE MATERIAL / EXTRA) */}
      {isPartnerSettlementOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2a4a] flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Registrar Baixa de Material (Partner Settlement)
              </h3>
              <button onClick={() => setIsPartnerSettlementOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium space-y-1">
                <p className="font-bold">Baixa de Ajuste entre Sócios (50/50)</p>
                <p className="text-[11px] text-amber-800">
                  Lançar o pagamento efetuado para zerar o saldo de materiais do projeto.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Quem Pagou (Payer)</Label>
                  <Input
                    value={settlementForm.payerName}
                    onChange={e => setSettlementForm({ ...settlementForm, payerName: e.target.value })}
                    placeholder="Quem enviou o dinheiro"
                  />
                </div>
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Quem Recebeu (Receiver)</Label>
                  <Input
                    value={settlementForm.receiverName}
                    onChange={e => setSettlementForm({ ...settlementForm, receiverName: e.target.value })}
                    placeholder="Quem recebeu o pagamento"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Valor do Pagamento ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settlementForm.amount}
                    onChange={e => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={settlementForm.date}
                    onChange={e => setSettlementForm({ ...settlementForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="font-bold text-gray-700 block mb-1">Método de Pagamento</Label>
                <select
                  value={settlementForm.paymentMethod}
                  onChange={e => setSettlementForm({ ...settlementForm, paymentMethod: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                >
                  <option value="zelle">Zelle Transfer</option>
                  <option value="venmo">Venmo</option>
                  <option value="cash">Dinheiro em Espécie (Cash)</option>
                  <option value="check">Cheque (Check)</option>
                  <option value="bank_transfer">Transferência Bancária</option>
                  <option value="card">Cartão</option>
                </select>
              </div>

              {/* Camera Photo Capture / Upload for Proof */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Label className="font-bold text-gray-700 block">Comprovante / Recibo do Pagamento</Label>
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
                          setSettlementFile(file);
                          setSettlementFileUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 text-[11px] hover:bg-gray-100 text-center">
                    🖼️ Carregar Imagem
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSettlementFile(file);
                          setSettlementFileUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
                {settlementFileUrl && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 mt-2">
                    <img src={settlementFileUrl} alt="Comprovante" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <Label className="font-bold text-gray-700 block mb-1">Observações / Referência</Label>
                <textarea
                  rows={2}
                  value={settlementForm.notes}
                  onChange={e => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                  placeholder="Ex: Baixa do saldo de materiais referente às compras no Home Depot."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsPartnerSettlementOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSettlementSubmit}
                disabled={isSavingSettlement || !settlementForm.amount}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {isSavingSettlement ? "Registrando Baixa..." : "Confirmar Baixa"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ITEMIZED COMPANY MATERIALS MODAL */}
      {isCompanyMaterialsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2a4a] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Company Materials &amp; Job Costs Breakdown
              </h3>
              <button onClick={() => setIsCompanyMaterialsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-purple-50 p-3 rounded-xl border border-purple-100">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Total Company Cost</span>
                  <p className="text-lg font-black text-purple-900">${partnerAccountingSummary.totalCompanyCost.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Equalized Partner Share (50/50)</span>
                  <p className="text-lg font-black text-purple-900">${(partnerAccountingSummary.totalCompanyCost / 2).toFixed(2)} each</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 text-xs">All Company Material Expenses Logged:</h4>
                {partnerAccountingSummary.companyExpenses.length === 0 ? (
                  <p className="text-gray-400 italic">No company materials logged for this job.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Vendor</th>
                          <th className="p-2.5">Paid By</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {partnerAccountingSummary.companyExpenses.map(exp => (
                          <tr key={exp.id}>
                            <td className="p-2.5 font-semibold text-gray-900">{new Date(exp.receipt_date).toLocaleDateString()}</td>
                            <td className="p-2.5 font-medium text-gray-900">{exp.vendor}</td>
                            <td className="p-2.5 font-bold text-purple-700">{exp.paid_by_name || "Company Account"}</td>
                            <td className="p-2.5 text-right font-bold text-gray-900">${exp.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsCompanyMaterialsModalOpen(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATE CLIENT PAYMENT MODAL */}
      {paymentToValidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2a4a] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                {validationAction === 'approve' ? "Validar Pagamento do Cliente" : "Rejeitar / Cancelar Pagamento"}
              </h3>
              <button onClick={() => setPaymentToValidate(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <p className="font-bold text-gray-900">Detalhes do Pagamento:</p>
                <p className="text-gray-600">Cliente: <span className="font-semibold text-gray-900">{paymentToValidate.customer_name || clientName}</span></p>
                <p className="text-gray-600">Valor: <span className="font-black text-emerald-700 text-sm">${paymentToValidate.amount.toFixed(2)}</span></p>
                <p className="text-gray-600">Método: <span className="uppercase font-semibold">{paymentToValidate.method}</span></p>
                {paymentToValidate.note && <p className="text-gray-500 italic">Notas: {paymentToValidate.note}</p>}
              </div>

              <div>
                <Label className="font-bold text-gray-700 block mb-1">Proprietário / Sócio que está Validando *</Label>
                <select
                  value={validatingUserName}
                  onChange={e => setValidatingUserName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                >
                  <option value="Hugo Luiz Ferreira dos Santos">Hugo Luiz Ferreira dos Santos (Sócio Proprietário)</option>
                  <option value="Adelmo Ferreira dos Santos">Adelmo Ferreira dos Santos (Sócio Proprietário)</option>
                  {user?.name && !['Hugo Luiz Ferreira dos Santos', 'Adelmo Ferreira dos Santos'].includes(user.name) && (
                    <option value={user.name}>{user.name} (Administrador)</option>
                  )}
                </select>
              </div>

              {validationAction === 'reject' && (
                <div>
                  <Label className="font-bold text-red-700 block mb-1">Motivo do Cancelamento / Rejeição *</Label>
                  <textarea
                    rows={3}
                    value={cancellationReason}
                    onChange={e => setCancellationReason(e.target.value)}
                    placeholder="Ex: Depósito não verificado na conta bancária da empresa ou comprovante ilegível."
                    className="w-full p-2.5 bg-red-50/50 border border-red-200 rounded-xl text-xs text-red-900 font-medium"
                  />
                  <p className="text-[10px] text-red-600 mt-1">
                    * Este motivo e o saldo devedor atual serão exibidos no Portal do Cliente e incluídos no Recibo de Cancelamento (PDF).
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setPaymentToValidate(null)}>Cancelar</Button>
              <Button
                onClick={handleValidatePaymentSubmit}
                disabled={isValidatingPayment || (validationAction === 'reject' && !cancellationReason.trim())}
                className={validationAction === 'approve' ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" : "bg-red-600 hover:bg-red-700 text-white font-bold text-xs"}
              >
                {isValidatingPayment ? "Processando..." : validationAction === 'approve' ? "Confirmar Validação" : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CLIENT PAYMENT MODAL */}
      {isEditPaymentOpen && editingPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-[#0b2a4a] flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                Alterar Baixa / Pagamento do Cliente
              </h3>
              <button onClick={() => { setIsEditPaymentOpen(false); setEditingPayment(null); }} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Valor ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <Label className="font-bold text-gray-700 block mb-1">Data</Label>
                  <Input
                    type="date"
                    value={paymentForm.date}
                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="font-bold text-gray-700 block mb-1">Método de Pagamento</Label>
                <select
                  value={paymentForm.method}
                  onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium"
                >
                  <option value="zelle">Zelle</option>
                  <option value="check">Check (Cheque)</option>
                  <option value="cash">Cash (Dinheiro)</option>
                  <option value="card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="venmo">Venmo</option>
                </select>
              </div>

              <div>
                <Label className="font-bold text-gray-700 block mb-1">Observações / Notas</Label>
                <textarea
                  rows={2}
                  value={paymentForm.note}
                  onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => { setIsEditPaymentOpen(false); setEditingPayment(null); }}>Cancelar</Button>
              <Button
                onClick={handleSaveClientPaymentEdit}
                disabled={isSavingPaymentEdit || !paymentForm.amount}
                className="bg-[#0b2a4a] text-white font-bold text-xs"
              >
                {isSavingPaymentEdit ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Item Detail Expanded View Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Detalhes Ampliados do Lançamento</h3>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                    {detailModalItem.type === 'client_material' && "Material do Cliente"}
                    {detailModalItem.type === 'company_material' && "Material Interno da Empresa"}
                    {detailModalItem.type === 'partner_settlement' && "Baixa de Acerto entre Sócios"}
                    {detailModalItem.type === 'extra' && "Order de Alteração / Extra"}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetailModalItem(null)} className="p-2 text-gray-400 hover:text-gray-700 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Details */}
            <div className="space-y-4 text-xs">
              {/* Item Title & Value */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Item / Descrição</span>
                  <p className="font-bold text-sm text-gray-900">
                    {detailModalItem.type === 'extra' 
                      ? (detailModalItem.item.description || "Change Order")
                      : (detailModalItem.item.vendor || detailModalItem.item.notes || "Lançamento")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Valor Total</span>
                  <p className="font-black text-lg text-emerald-700">
                    ${(detailModalItem.item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Audit Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Data do Lançamento</span>
                  <p className="font-bold text-gray-800">
                    {new Date(detailModalItem.item.receipt_date || detailModalItem.item.created_at || detailModalItem.item.payment_date || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Quem Pagou / Solicitou</span>
                  <p className="font-bold text-purple-800">
                    {detailModalItem.item.paid_by_name || detailModalItem.item.uploaded_by || user?.name || "Administração"}
                  </p>
                </div>
                {detailModalItem.item.payment_method && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Forma de Pagamento</span>
                    <p className="font-bold text-gray-800 uppercase">{detailModalItem.item.payment_method}</p>
                  </div>
                )}
                {detailModalItem.type === 'partner_settlement' && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Tipo de Transação</span>
                    <p className="font-bold text-emerald-700">Baixa Direta entre Sócios (100%)</p>
                  </div>
                )}
              </div>

              {/* Detailed Notes / Scope */}
              {(detailModalItem.item.notes || detailModalItem.item.reason || detailModalItem.item.description) && (
                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-900 block">Observações / Motivo Completo</span>
                  <p className="text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                    {detailModalItem.item.notes || detailModalItem.item.reason || detailModalItem.item.description}
                  </p>
                </div>
              )}

              {/* Attached Proof / Receipts */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-amber-600" /> Comprovante / Anexo Anexado
                </span>

                {isLoadingDetailMedia ? (
                  <p className="text-xs text-gray-400 italic py-2">Carregando anexo do comprovante...</p>
                ) : detailModalItem.mediaUrl ? (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center relative group">
                    <img
                      src={detailModalItem.mediaUrl}
                      alt="Comprovante Anexado"
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={() => setSelectedMediaUrl(detailModalItem.mediaUrl!)}
                    />
                    <button
                      onClick={() => setSelectedMediaUrl(detailModalItem.mediaUrl!)}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white font-bold text-[10px] rounded-xl backdrop-blur-sm"
                    >
                      🔍 Expandir Imagem
                    </button>
                  </div>
                ) : detailModalItem.extraMediaUrls && detailModalItem.extraMediaUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {detailModalItem.extraMediaUrls.map((url, idx) => (
                      <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-slate-900 relative group cursor-pointer" onClick={() => setSelectedMediaUrl(url)}>
                        <img src={url} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Nenhum comprovante/foto anexado a este lançamento.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button onClick={() => setDetailModalItem(null)} className="bg-[#0b2a4a] text-white font-bold text-xs rounded-xl px-5">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Partner Transactions Audit Extrato Modal */}
      {isPartnerAuditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 text-purple-800 rounded-2xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Extrato Auditável de Acerto entre Sócios</h3>
                  <p className="text-xs text-gray-500">Demonstrativo completo de despesas pessoais avançadas (50/50) e pagamentos efetuados.</p>
                </div>
              </div>
              <button onClick={() => setIsPartnerAuditModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Audit Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">Avançado por {partnerAccountingSummary.hugoName}</span>
                <p className="text-xl font-black text-blue-950">${partnerAccountingSummary.hugoPaid.toFixed(2)}</p>
                <p className="text-[10px] text-blue-700 font-medium">{partnerAccountingSummary.hugoOutofPocketExpenses.length} nota(s) pessoal(is)</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">Avançado por {partnerAccountingSummary.partner2Name}</span>
                <p className="text-xl font-black text-purple-950">${partnerAccountingSummary.partner2Paid.toFixed(2)}</p>
                <p className="text-[10px] text-purple-700 font-medium">{partnerAccountingSummary.partner2OutofPocketExpenses.length} nota(s) pessoal(is)</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Total Já Liquidado</span>
                <p className="text-xl font-black text-emerald-950">${partnerAccountingSummary.totalSettledAmount.toFixed(2)}</p>
                <p className="text-[10px] text-emerald-700 font-medium">{partnerAccountingSummary.settlementRecords.length} pagamento(s) entre sócios</p>
              </div>
            </div>

            {/* Out-of-Pocket Items Lists */}
            <div className="space-y-4 text-xs">
              {/* Hugo Out-of-Pocket List */}
              <div className="space-y-2 border border-blue-200 rounded-2xl p-4 bg-blue-50/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
                    👤 Despesas Pessoais Avançadas — {partnerAccountingSummary.hugoName} (${partnerAccountingSummary.hugoPaid.toFixed(2)})
                  </h4>
                </div>
                {partnerAccountingSummary.hugoOutofPocketExpenses.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nenhuma despesa de material da empresa paga com cartão pessoal de Hugo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-blue-200 text-blue-900 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="pb-2">Data</th>
                          <th className="pb-2">Fornecedor / Item</th>
                          <th className="pb-2 text-right">Valor</th>
                          <th className="pb-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {partnerAccountingSummary.hugoOutofPocketExpenses.map(e => (
                          <tr key={e.id}>
                            <td className="py-2 font-semibold text-gray-800">{new Date(e.receipt_date).toLocaleDateString()}</td>
                            <td className="py-2 font-bold text-gray-900">{e.vendor} <span className="font-normal text-gray-500">({e.notes?.replace('Job Expense for ', '') || 'Material'})</span></td>
                            <td className="py-2 text-right font-black text-blue-950">${e.amount.toFixed(2)}</td>
                            <td className="py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsCompanyCard(e.id)}
                                className="h-6 text-[10px] text-purple-700 hover:text-purple-900 hover:bg-purple-100 font-bold px-2 rounded-lg"
                                title="Mudar para Cartão da Empresa"
                              >
                                💳 Mudar p/ Cartão Empresa
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Adelmo Out-of-Pocket List */}
              <div className="space-y-2 border border-purple-200 rounded-2xl p-4 bg-purple-50/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                    👤 Despesas Pessoais Avançadas — {partnerAccountingSummary.partner2Name} (${partnerAccountingSummary.partner2Paid.toFixed(2)})
                  </h4>
                </div>
                {partnerAccountingSummary.partner2OutofPocketExpenses.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nenhuma despesa de material da empresa paga com cartão pessoal de Adelmo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-purple-200 text-purple-900 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="pb-2">Data</th>
                          <th className="pb-2">Fornecedor / Item</th>
                          <th className="pb-2 text-right">Valor</th>
                          <th className="pb-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100">
                        {partnerAccountingSummary.partner2OutofPocketExpenses.map(e => (
                          <tr key={e.id}>
                            <td className="py-2 font-semibold text-gray-800">{new Date(e.receipt_date).toLocaleDateString()}</td>
                            <td className="py-2 font-bold text-gray-900">{e.vendor} <span className="font-normal text-gray-500">({e.notes?.replace('Job Expense for ', '') || 'Material'})</span></td>
                            <td className="py-2 text-right font-black text-purple-950">${e.amount.toFixed(2)}</td>
                            <td className="py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsCompanyCard(e.id)}
                                className="h-6 text-[10px] text-purple-700 hover:text-purple-900 hover:bg-purple-100 font-bold px-2 rounded-lg"
                                title="Mudar para Cartão da Empresa"
                              >
                                💳 Mudar p/ Cartão Empresa
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments / Settlements List */}
              <div className="space-y-2 border border-emerald-200 rounded-2xl p-4 bg-emerald-50/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                    💳 Pagamentos &amp; Baixas Efetuadas entre Sócios (${partnerAccountingSummary.totalSettledAmount.toFixed(2)})
                  </h4>
                </div>
                {partnerAccountingSummary.settlementRecords.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">Nenhum pagamento registrado entre sócios para este projeto ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-emerald-200 text-emerald-900 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="pb-2">Data</th>
                          <th className="pb-2">Transação</th>
                          <th className="pb-2">Método</th>
                          <th className="pb-2 text-right">Valor Baixado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {partnerAccountingSummary.settlementRecords.map(e => (
                          <tr key={e.id}>
                            <td className="py-2 font-semibold text-gray-800">{new Date(e.receipt_date).toLocaleDateString()}</td>
                            <td className="py-2 font-bold text-emerald-900">{e.vendor || "Pagamento entre Sócios"}</td>
                            <td className="py-2 uppercase text-gray-600 font-medium">{e.payment_method || "Zelle"}</td>
                            <td className="py-2 text-right font-black text-emerald-800">-${e.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Net Balance Status */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Resultado da Igualação 50/50</span>
                  <p className="text-base font-black text-amber-950 mt-0.5">
                    {partnerAccountingSummary.netOwedAmount > 0 ? (
                      <>{partnerAccountingSummary.netOwedFrom} deve a {partnerAccountingSummary.netOwedTo}: <span className="text-amber-900 text-lg">${partnerAccountingSummary.netOwedAmount.toFixed(2)}</span></>
                    ) : (
                      <span className="text-emerald-800">Contas 100% Saldadas entre os Sócios!</span>
                    )}
                  </p>
                </div>
                {partnerAccountingSummary.netOwedAmount > 0 && (
                  <Button
                    onClick={() => {
                      setIsPartnerAuditModalOpen(false);
                      setSettlementForm({
                        payerName: partnerAccountingSummary.netOwedFrom,
                        receiverName: partnerAccountingSummary.netOwedTo,
                        amount: partnerAccountingSummary.netOwedAmount.toFixed(2),
                        date: new Date().toISOString().slice(0, 10),
                        paymentMethod: "zelle",
                        notes: ""
                      });
                      setIsPartnerSettlementOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                  >
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar Baixa / Pagar Partner
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button onClick={() => setIsPartnerAuditModalOpen(false)} className="bg-[#0b2a4a] text-white font-bold text-xs rounded-xl px-5">
                Fechar Extrato
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
