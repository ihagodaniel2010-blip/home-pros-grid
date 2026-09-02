import { supabase, supabasePublic, isSupabaseConfigured } from "@/lib/supabase";

export interface StatusChange {
  status: string;
  timestamp: string;
}

export interface Lead {
  id: string;
  organization_id?: string;
  createdAt: string;
  serviceSlug: string;
  zip: string;
  selectedServiceOption: string;
  subtype?: string;
  details?: string;
  locationType: string;
  fullName: string;
  address: string;
  email: string;
  phone: string;
  selectedPros: string[];
  status: "New" | "Contacted" | "Estimate Sent" | "Approved" | "Closed";
  ownerNotes: string;
  updatedAt: string;
  statusHistory: StatusChange[];
  // Novos campos profissionais
  description?: string;
  preferred_contact_method?: "email" | "phone" | "text";
  spam_score?: number;
  is_spam?: boolean;
  media_urls?: string[];
}

// ─── LOCAL STORAGE FALLBACK ──────────────────────────────
const LEADS_KEY = "ha_construction_leads";

const getLeadsLocal = (): Lead[] => {
  try {
    const data = localStorage.getItem(LEADS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLeadLocal = (lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory">): Lead => {
  const now = new Date().toISOString();
  const newLead: Lead = {
    ...lead,
    id: crypto.randomUUID(),
    createdAt: now,
    status: "New",
    ownerNotes: "",
    updatedAt: now,
    statusHistory: [{ status: "New", timestamp: now }],
  };
  const leads = getLeadsLocal();
  leads.unshift(newLead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  return newLead;
};

const updateLeadLocal = (id: string, updates: Partial<Lead>): Lead | null => {
  const leads = getLeadsLocal();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated = { ...leads[idx], ...updates, updatedAt: now };
  if (updates.status && updates.status !== leads[idx].status) {
    updated.statusHistory = [...(updated.statusHistory || []), { status: updates.status, timestamp: now }];
  }
  leads[idx] = updated;
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  return updated;
};

// ─── SUPABASE ────────────────────────────────────────────
const mapFrontendStatusToDb = (status: string): string => {
  switch (status) {
    case "New": return "new";
    case "Contacted": return "contacted";
    case "Estimate Sent": return "distributed";
    case "Approved": return "converted";
    case "Closed": return "closed";
    default: return status.toLowerCase();
  }
};

const mapDbStatusToFrontend = (status: string): "New" | "Contacted" | "Estimate Sent" | "Approved" | "Closed" => {
  switch (status?.toLowerCase()) {
    case "new": return "New";
    case "contacted": return "Contacted";
    case "distributed": return "Estimate Sent";
    case "converted": return "Approved";
    case "closed": return "Closed";
    default: return "New";
  }
};

// ─── SUPABASE ────────────────────────────────────────────
const getLeadsSupabase = async (organizationId?: string): Promise<Lead[]> => {
  if (!supabase) return [];
  
  // Note: We don't filter by organizationId here so that the organization can see both:
  // 1. Leads they created directly (with organization_id = their org)
  // 2. Public leads distributed to them via lead_distributions (which have organization_id = NULL in the main table)
  // RLS on the Supabase database takes care of filtering automatically.
  const { data, error } = await supabase.rpc("get_my_organization_leads");
  if (error) {
    console.error("Supabase getLeads error:", error.message);
    return [];
  }
  
  return (data || []).map((lead: any) => ({
    ...lead,
    status: mapDbStatusToFrontend(lead.status),
    statusHistory: (lead.statusHistory || []).map((h: any) => ({
      status: mapDbStatusToFrontend(h.status),
      timestamp: h.timestamp
    }))
  })) as Lead[];
};
const saveLeadSupabase = async (
  lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory"> & { organization_id?: string; taskSlug?: string; clientAnswers?: any }
): Promise<Lead> => {
  if (!supabasePublic) throw new Error("Supabase not configured");
  const now = new Date().toISOString();

  const rpcPayload = {
    p_service_slug: lead.serviceSlug,
    p_selected_service_option: lead.selectedServiceOption,
    p_location_type: lead.locationType,
    p_full_name: lead.fullName,
    p_email: lead.email,
    p_phone: lead.phone,
    p_zip: lead.zip,
    p_address: lead.address,
    p_details: lead.details || null,
    p_subtype: lead.subtype || null,
    p_media_urls: lead.media_urls || null,
    p_selected_pros: lead.selectedPros || null,
    p_task_slug: lead.taskSlug || null,
    p_client_answers: lead.clientAnswers || {}
  };

  const { data, error } = await supabasePublic!.rpc("submit_public_lead", rpcPayload);

  if (error) {
    console.error("Supabase submit_public_lead error:", error);
    if (error.message.includes("Could not find the function")) {
      throw new Error("Public lead RPC is not applied yet.");
    }
    throw new Error(error.message);
  }

  if (data && data.success === false) {
    throw new Error(data.error || "Failed to submit public lead");
  }

  return {
    ...lead,
    organization_id: null,
    source: "public",
    status: "New",
    statusHistory: [{ status: "New", timestamp: now }],
    id: data?.lead_id || "temp",
    createdAt: now,
    updatedAt: now
  } as unknown as Lead;
};

const updateLeadSupabase = async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("leads").select("statusHistory, status").eq("id", id).single();
  
  const dbStatus = updates.status ? mapFrontendStatusToDb(updates.status) : undefined;
  const currentStatus = current?.status;
  
  const statusHistory = current?.statusHistory || [];
  if (dbStatus && dbStatus !== currentStatus) {
    statusHistory.push({ status: dbStatus, timestamp: now });
  }
  
  const dbUpdates = {
    ...updates,
    status: dbStatus,
    updatedAt: now,
    statusHistory
  };
  
  const { data, error } = await supabase
    .from("leads")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("Supabase updateLead error:", error.message);
    return null;
  }
  
  return {
    ...data,
    status: mapDbStatusToFrontend(data.status),
    statusHistory: (data.statusHistory || []).map((h: any) => ({
      status: mapDbStatusToFrontend(h.status),
      timestamp: h.timestamp
    }))
  } as Lead;
};

// ─── EXPORTS PÚBLICOS ─────────────────────────────────────
export const getLeads = async (organizationId?: string): Promise<Lead[]> => {
  if (isSupabaseConfigured && supabase) return getLeadsSupabase(organizationId);
  return getLeadsLocal();
};

export const saveLead = async (
  lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory"> & { organization_id?: string; taskSlug?: string; clientAnswers?: any }
): Promise<Lead> => {
  if (isSupabaseConfigured && supabase) return saveLeadSupabase(lead);
  return saveLeadLocal(lead);
};

export const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
  if (isSupabaseConfigured && supabase) return updateLeadSupabase(id, updates);
  return updateLeadLocal(id, updates);
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
  if (isSupabaseConfigured && supabase) {
    if (!supabase) return null;
    const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
    if (error) return null;
    return {
      ...data,
      status: mapDbStatusToFrontend(data.status),
      statusHistory: (data.statusHistory || []).map((h: any) => ({
        status: mapDbStatusToFrontend(h.status),
        timestamp: h.timestamp
      }))
    } as Lead;
  }
  return getLeadsLocal().find((l) => l.id === id) || null;
};
