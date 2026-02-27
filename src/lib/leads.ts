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
const LEADS_KEY = "barrigudo_leads";

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
const getLeadsSupabase = async (organizationId?: string): Promise<Lead[]> => {
  if (!supabase) return [];
  let query = supabase
    .from("leads")
    .select("*")
    .order("createdAt", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase getLeads error:", error.message);
    return [];
  }
  return (data || []) as Lead[];
};

const saveLeadSupabase = async (
  lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory"> & { organization_id?: string }
): Promise<Lead> => {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const defaultOrgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;

  const payload = {
    ...lead,
    organization_id: lead.organization_id || defaultOrgId,
    status: "New",
    ownerNotes: "",
    updatedAt: now,
    statusHistory: [{ status: "New", timestamp: now }],
  };
  const { error } = await supabasePublic!.from("leads").insert(payload);
  if (error) {
    console.error("Supabase saveLead error:", error);
    throw new Error(error.message);
  }
  return { ...payload, id: "temp", createdAt: now } as Lead;
};

const updateLeadSupabase = async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("leads").select("statusHistory, status").eq("id", id).single();
  const statusHistory = current?.statusHistory || [];
  if (updates.status && updates.status !== current?.status) {
    statusHistory.push({ status: updates.status, timestamp: now });
  }
  const { data, error } = await supabase
    .from("leads")
    .update({ ...updates, updatedAt: now, statusHistory })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("Supabase updateLead error:", error.message);
    return null;
  }
  return data as Lead;
};

// ─── EXPORTS PÚBLICOS ─────────────────────────────────────
export const getLeads = async (organizationId?: string): Promise<Lead[]> => {
  if (isSupabaseConfigured && supabase) return getLeadsSupabase(organizationId);
  return getLeadsLocal();
};

export const saveLead = async (
  lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory"> & { organization_id?: string }
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
    return data as Lead;
  }
  return getLeadsLocal().find((l) => l.id === id) || null;
};
