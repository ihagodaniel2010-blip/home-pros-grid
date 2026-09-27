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
  preferred_contact_methods?: string[];
  street_address?: string;
  unit?: string;
  city?: string;
  state?: string;
  lead_source?: string;
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

// ─── HELPER DE MAPEAMENTO E PARSER COMPLETO DE ENDEREÇO ───
export interface ParsedLeadAddress {
  street_address: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  full_street_address: string;
}

export const normalizeUSState = (stateInput?: string | null): string => {
  if (!stateInput) return "";
  const str = stateInput.trim();
  const parenMatch = str.match(/\((([A-Za-z]){2})\)/);
  if (parenMatch) {
    return parenMatch[1].toUpperCase();
  }
  
  if (/^[A-Za-z]{2}$/.test(str)) {
    return str.toUpperCase();
  }

  const stateMap: Record<string, string> = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
    "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
    "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
    "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
    "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY"
  };

  const lower = str.toLowerCase();
  if (stateMap[lower]) {
    return stateMap[lower];
  }

  return str.toUpperCase().slice(0, 2);
};

export const parseLeadAddressComplete = (lead: any): ParsedLeadAddress => {
  let street = lead?.street_address || "";
  let unit = lead?.unit || "";
  let city = lead?.city || "";
  let state = lead?.state || "";
  let zip = lead?.zip || "";

  const ca = lead?.client_answers || lead?.clientAnswers || {};
  if (!street && ca.street_address) street = ca.street_address;
  if (!unit && ca.unit) unit = ca.unit;
  if (!city && ca.city) city = ca.city;
  if (!state && ca.state) state = ca.state;
  if (!zip && ca.zip) zip = ca.zip;

  // 1. Extrai do campo details (string formatada do formulário público)
  const details = lead?.details || "";
  if ((!street || !city || !state || !zip) && details.includes("CITY/STATE/ZIP:")) {
    const lines = details.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("STREET ADDRESS:") && !street) {
        street = trimmed.replace("STREET ADDRESS:", "").trim();
      } else if (trimmed.startsWith("UNIT/SUITE:") && !unit) {
        const u = trimmed.replace("UNIT/SUITE:", "").trim();
        if (u && u !== "N/A") unit = u;
      } else if (trimmed.startsWith("CITY/STATE/ZIP:")) {
        const csz = trimmed.replace("CITY/STATE/ZIP:", "").trim();
        const cszMatch = csz.match(/^([^,]+),\s*(.+?)\s+(\d{5}(-\d{4})?)$/);
        if (cszMatch) {
          if (!city) city = cszMatch[1].trim();
          if (!state) state = cszMatch[2].trim();
          if (!zip) zip = cszMatch[3].trim();
        }
      }
    }
  }

  // 2. Extrai da string composta lead.address se city/state/street continuarem ausentes
  const addressStr = lead?.address || "";
  if ((!city || !state || !street) && addressStr) {
    const parts = addressStr.split(",").map((s: string) => s.trim());
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/^(.+?)\s+(\d{5}(-\d{4})?)$/);
      if (stateZipMatch) {
        if (!state) state = stateZipMatch[1].trim();
        if (!zip) zip = stateZipMatch[2].trim();
      } else if (!state) {
        state = lastPart;
      }

      if (!city) {
        city = parts[parts.length - 2].trim();
      }

      if (!street) {
        const streetParts = parts.slice(0, parts.length - 2);
        street = streetParts.join(", ");
      }
    } else if (parts.length === 2) {
      if (!street) street = parts[0];
      const second = parts[1];
      const stateZipMatch = second.match(/^(.+?)\s+(\d{5}(-\d{4})?)$/);
      if (stateZipMatch) {
        if (!state) state = stateZipMatch[1].trim();
        if (!zip) zip = stateZipMatch[2].trim();
      }
    } else if (!street) {
      street = addressStr;
    }
  }

  // Junta street e unit para o campo Client Address
  let fullStreet = street;
  if (unit && unit !== "N/A" && street && !street.toLowerCase().includes(unit.toLowerCase())) {
    fullStreet = `${street}, ${unit.startsWith("Apt") || unit.startsWith("Unit") || unit.startsWith("Ste") || unit.startsWith("#") ? unit : "Apt " + unit}`;
  } else if (!fullStreet && unit && unit !== "N/A") {
    fullStreet = unit;
  }

  return {
    street_address: street,
    unit: unit === "N/A" ? "" : unit,
    city,
    state: normalizeUSState(state),
    zip,
    full_street_address: fullStreet
  };
};

export const cleanProjectScopeNotes = (details?: string | null): string => {
  if (!details) return "";
  const lines = details.split("\n");
  const filteredLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("STREET ADDRESS:") ||
      trimmed.startsWith("UNIT/SUITE:") ||
      trimmed.startsWith("CITY/STATE/ZIP:") ||
      trimmed.startsWith("LEAD SOURCE:")
    ) {
      continue;
    }
    
    if (trimmed.startsWith("PROJECT DESCRIPTION:")) {
      filteredLines.push(trimmed.replace("PROJECT DESCRIPTION:", "").trim());
    } else {
      filteredLines.push(trimmed);
    }
  }

  return filteredLines.join("\n").trim();
};

// ─── SUPABASE ────────────────────────────────────────────
const getLeadsSupabase = async (organizationId?: string): Promise<Lead[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase.rpc("get_my_organization_leads");
  if (error) {
    console.error("Supabase getLeads error:", error.message);
    return [];
  }
  
  return (data || []).map((lead: any) => {
    const parsedAddr = parseLeadAddressComplete(lead);
    return {
      ...lead,
      street_address: parsedAddr.street_address,
      unit: parsedAddr.unit,
      city: parsedAddr.city,
      state: parsedAddr.state,
      zip: parsedAddr.zip || lead.zip,
      preferred_contact_methods: lead.preferred_contact_methods || (lead.client_answers?.preferred_contact_methods) || (lead.preferred_contact_method ? [lead.preferred_contact_method] : []),
      status: mapDbStatusToFrontend(lead.status),
      statusHistory: (lead.statusHistory || []).map((h: any) => ({
        status: mapDbStatusToFrontend(h.status),
        timestamp: h.timestamp
      }))
    };
  }) as Lead[];
};

const saveLeadSupabase = async (
  lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory"> & { organization_id?: string; taskSlug?: string; clientAnswers?: any }
): Promise<Lead> => {
  if (!supabasePublic) throw new Error("Supabase not configured");
  const now = new Date().toISOString();

  const clientAnswers = lead.clientAnswers || {
    street_address: lead.street_address,
    unit: lead.unit,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    preferred_contact_methods: lead.preferred_contact_methods || (lead.preferred_contact_method ? [lead.preferred_contact_method] : []),
    project_type: lead.selectedServiceOption,
    project_description: lead.description
  };

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
    p_client_answers: clientAnswers
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

export const createLead = saveLead;

export const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
  if (isSupabaseConfigured && supabase) return updateLeadSupabase(id, updates);
  return updateLeadLocal(id, updates);
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
  if (isSupabaseConfigured && supabase) {
    if (!supabase) return null;
    const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
    if (error) return null;
    const parsedAddr = parseLeadAddressComplete(data);
    return {
      ...data,
      street_address: parsedAddr.street_address,
      unit: parsedAddr.unit,
      city: parsedAddr.city,
      state: parsedAddr.state,
      zip: parsedAddr.zip || data.zip,
      preferred_contact_methods: data.preferred_contact_methods || (data.client_answers?.preferred_contact_methods) || (data.preferred_contact_method ? [data.preferred_contact_method] : []),
      status: mapDbStatusToFrontend(data.status),
      statusHistory: (data.statusHistory || []).map((h: any) => ({
        status: mapDbStatusToFrontend(h.status),
        timestamp: h.timestamp
      }))
    } as Lead;
  }
  return getLeadsLocal().find((l) => l.id === id) || null;
};

