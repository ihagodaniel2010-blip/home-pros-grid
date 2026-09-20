import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Clock, Save, FileText, User, Mail, Phone, MapPin, CheckCircle2,
  MoreHorizontal, Images, Wrench, UserCheck, DollarSign, Plus, Download, Copy,
  Printer, ShieldCheck, PenTool, Calendar, AlertCircle, Sparkles, ExternalLink,
  ChevronRight, Eye, EyeOff, Globe, Tag, CreditCard, Receipt, FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";
import { getEstimateById, Estimate } from "@/lib/estimates";
import { getServiceExtrasByJobId, createServiceExtra, ServiceExtra } from "@/lib/service-extras";
import { getJobMediaRecords, uploadJobMediaRecord, updateJobMediaVisibility, ServiceJobMediaRecord } from "@/lib/job-media";
import { getExpenses, createExpense, Expense, updateExpense } from "@/lib/expenses";
import { getClientPayments, createClientPayment, ClientPayment } from "@/lib/client-payments";
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
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);

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
    reimbursableToOwner: true,
    billToClient: false
  });

  // Media Form State
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaFileUrl, setMediaFileUrl] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaVisibility, setMediaVisibility] = useState<"admin" | "client" | "public">("client");

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

  const orgId = user?.organization?.id || DEFAULT_ORG_ID;

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

    // Company Job Costs (materials & expenses paid by company)
    const companyMaterialsCost = expenses
      .filter(e => !e.bill_to_client && (e as any).material_responsibility !== 'client')
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
  }, [estimate, extras, expenses, payments]);

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

      setExtras(prev => [newExtra, ...prev]);
      setIsAddExtraOpen(false);
      setExtraForm({ description: "", reason: "", amount: "", scheduleImpact: "0 days" });
      setActiveTab("extras");
      toast.success("Change Order created successfully!");
    } catch (err: any) {
      console.error("Create extra error:", err);
      toast.error(`Failed to create Extra: ${err?.message || "Database error"}`);
    } finally {
      setIsSavingExtra(false);
    }
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

      // Find partner matching paidByName if paid personally by partner
      const matchedPartner = partners.find(p => 
        p.name === expenseForm.paidByName || 
        expenseForm.paidByName.includes(p.name) ||
        p.name.includes(expenseForm.paidByName.split(' ')[0])
      );

      const { receipt: created } = await createExpense({
        organization_id: orgId,
        service_job_id: job.id,
        estimate_id: job.estimate_id || null,
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
      } as any);

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
        reimbursableToOwner: true,
        billToClient: false
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
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMediaFile(file);
      if (mediaFileUrl && mediaFileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mediaFileUrl);
      }
      const url = URL.createObjectURL(file);
      setMediaFileUrl(url);
    }
  };

  const handleAddMediaSubmit = async () => {
    if (!job || (!selectedMediaFile && !mediaFileUrl)) {
      toast.error("Please select a photo or video file.");
      return;
    }

    setIsSavingMedia(true);
    try {
      let finalStoragePath = "";
      const isVideo = selectedMediaFile?.type.startsWith("video/") || false;
      const mediaType = isVideo ? "video" : "image";
      const fileExt = selectedMediaFile?.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const relativePath = `${orgId}/jobs/${job.id}/${isVideo ? "videos" : "photos"}/${Date.now()}.${fileExt}`;

      if (selectedMediaFile) {
        // Read file as Base64 Data URL fallback
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedMediaFile);
        });

        // Try storage upload first
        try {
          const { error: uploadErr } = await supabase.storage
            .from("images")
            .upload(relativePath, selectedMediaFile);

          if (!uploadErr) {
            const { data } = supabase.storage.from("images").getPublicUrl(relativePath);
            if (data?.publicUrl) finalStoragePath = data.publicUrl;
          }
        } catch (sErr) {
          console.warn("Storage upload for job media handled, using Data URL fallback:", sErr);
        }

        if (!finalStoragePath) {
          finalStoragePath = dataUrl;
        }
      } else {
        finalStoragePath = mediaFileUrl!;
      }

      const record = await uploadJobMediaRecord({
        organization_id: orgId,
        service_job_id: job.id,
        media_type: mediaType,
        storage_path: finalStoragePath,
        file_name: selectedMediaFile?.name || `job_media_${Date.now()}.${fileExt}`,
        mime_type: selectedMediaFile?.type || (isVideo ? "video/mp4" : "image/jpeg"),
        file_size_bytes: selectedMediaFile?.size || 1048576,
        caption: mediaCaption.trim() || "Job progress documentation"
      });

      setMedia(prev => [record, ...prev]);
      setIsAddMediaOpen(false);
      setSelectedMediaFile(null);
      setMediaFileUrl(null);
      setMediaCaption("");
      setActiveTab("media");
      toast.success(`${isVideo ? "Job video" : "Job photo"} uploaded successfully!`);
    } catch (err: any) {
      console.error("Upload job media error:", err);
      toast.error("Failed to upload job photo/video.");
    } finally {
      setIsSavingMedia(false);
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
                        <th className="p-3">Notes</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map(payment => (
                        <tr key={payment.id}>
                          <td className="p-3 font-semibold text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="p-3 capitalize text-gray-700">{payment.method}</td>
                          <td className="p-3 text-gray-500">{payment.note || "Payment received"}</td>
                          <td className="p-3">
                            <Badge className="bg-emerald-100 text-emerald-800 capitalize font-bold text-[10px]">
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 text-sm">${payment.amount.toLocaleString()}</td>
                        </tr>
                      ))}
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
                  {extras.map(extra => (
                    <div key={extra.id} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{extra.description}</p>
                          {extra.reason && <p className="text-xs text-gray-500 mt-0.5">Reason: {extra.reason}</p>}
                        </div>
                        <span className="font-bold text-base text-purple-700">+${extra.amount.toLocaleString()}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200 text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            extra.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {extra.status}
                          </span>
                          {extra.schedule_impact && <span className="text-gray-500 font-medium">Impact: {extra.schedule_impact}</span>}
                        </div>

                        {extra.public_token && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/extra/${extra.public_token}`);
                              toast.success("Extra proposal link copied!");
                            }}
                            className="font-bold text-blue-600 hover:underline"
                          >
                            Copy Client Approval Link
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
                    const mediaUrl = m.storage_path.startsWith('http') || m.storage_path.startsWith('data:')
                      ? m.storage_path
                      : supabase.storage.from('images').getPublicUrl(m.storage_path).data.publicUrl;

                    const portfolioStatus = m.portfolio_approved
                      ? 'Approved'
                      : m.visible_on_public_site
                      ? 'Pending Review'
                      : 'Not Submitted';

                    return (
                      <div key={m.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col group cursor-pointer" onClick={() => setLightboxMedia(m)}>
                        <div className="aspect-video relative overflow-hidden bg-slate-900 flex items-center justify-center">
                          {m.media_type === 'video' ? (
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
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
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
                  <Button onClick={() => setIsAddExpenseOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9">
                    <Plus className="h-3.5 w-3.5 mr-1" /> + Add Client Material
                  </Button>
                </div>
              </div>

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
                        <th className="p-3">Client Status</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/80">
                      {expenses.filter(e => e.bill_to_client).map(mat => (
                        <tr key={mat.id}>
                          <td className="p-3 font-semibold text-gray-900">{new Date(mat.receipt_date).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-gray-900">{mat.vendor}</td>
                          <td className="p-3 text-gray-600">{mat.paid_by_name || "Company Account"}</td>
                          <td className="p-3">
                            <Badge className="bg-amber-100 text-amber-900 capitalize font-bold text-[10px]">
                              {mat.client_reimbursement_status || "pending"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-amber-900 text-sm">${mat.amount.toLocaleString()}</td>
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
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-900 font-bold text-xs px-3 py-1">
                    Company Job Cost: ${financialSummary.companyMaterialsCost.toLocaleString()}
                  </Badge>
                  <Button onClick={() => setIsAddExpenseOpen(true)} className="bg-[#0b2a4a] text-white font-bold text-xs h-9">
                    <Plus className="h-3.5 w-3.5 mr-1" /> + Add Company Material
                  </Button>
                </div>
              </div>

              {expenses.filter(e => !e.bill_to_client).length === 0 ? (
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenses.filter(e => !e.bill_to_client).map(exp => {
                        const halfAmount = exp.amount / 2;
                        const paidByName = exp.paid_by_name || "Company Account";
                        return (
                          <tr key={exp.id}>
                            <td className="p-3 font-semibold text-gray-900">{new Date(exp.receipt_date).toLocaleDateString()}</td>
                            <td className="p-3 font-medium text-gray-900">{exp.vendor}</td>
                            <td className="p-3 text-purple-700 font-bold">{paidByName}</td>
                            <td className="p-3 text-gray-600 font-mono text-[11px]">
                              {exp.payment_source === 'partner_personal' || exp.reimbursable_to_owner
                                ? `${paidByName}: $${exp.amount.toFixed(2)} advanced (Hugo: $${halfAmount.toFixed(2)} / Brother: $${halfAmount.toFixed(2)})`
                                : `Company Card ($${exp.amount.toFixed(2)})`}
                            </td>
                            <td className="p-3 text-right font-bold text-gray-900 text-sm">${exp.amount.toLocaleString()}</td>
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
                  onChange={e => setExpenseForm({ ...expenseForm, paidByName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Company Card">Company Card / Account</option>
                  {partners.filter(p => p.active === true).map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} (Partner Personal Card / Cash)
                    </option>
                  ))}
                  <option value="Customer Paid Direct">Customer Paid Direct</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Mobile-First Receipt Photo Capture (Requirement 13 & 28) */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Label className="font-bold text-gray-700 block">Receipt Attachment (Mobile Options)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 text-[11px] hover:bg-blue-100">
                    📷 Take Receipt Photo
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMediaFileSelect} />
                  </label>
                  <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 text-[11px] hover:bg-gray-100">
                    🖼️ Choose File / PDF
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleMediaFileSelect} />
                  </label>
                </div>
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

      {/* 7. Media Lightbox Modal (Requirement 8) */}
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
              {lightboxMedia.media_type === 'video' ? (
                <video
                  src={lightboxMedia.storage_path.startsWith('http') || lightboxMedia.storage_path.startsWith('data:')
                    ? lightboxMedia.storage_path
                    : supabase.storage.from('images').getPublicUrl(lightboxMedia.storage_path).data.publicUrl
                  }
                  controls
                  autoPlay
                  className="max-h-[70vh] w-auto max-w-full rounded-xl"
                />
              ) : (
                <img
                  src={lightboxMedia.storage_path.startsWith('http') || lightboxMedia.storage_path.startsWith('data:')
                    ? lightboxMedia.storage_path
                    : supabase.storage.from('images').getPublicUrl(lightboxMedia.storage_path).data.publicUrl
                  }
                  alt={lightboxMedia.caption || "Job photo"}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
                />
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
    </div>
  );
}
