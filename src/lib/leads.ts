export interface StatusChange {
  status: string;
  timestamp: string;
}

export interface Lead {
  id: string;
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
  status: "New" | "Contacted" | "Won" | "Lost";
  ownerNotes: string;
  updatedAt: string;
  statusHistory: StatusChange[];
}

const LEADS_KEY = "networx_leads";

export const getLeads = (): Lead[] => {
  try {
    const data = localStorage.getItem(LEADS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveLead = (lead: Omit<Lead, "id" | "createdAt" | "status" | "ownerNotes" | "updatedAt" | "statusHistory">): Lead => {
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
  const leads = getLeads();
  leads.unshift(newLead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  return newLead;
};

export const updateLead = (id: string, updates: Partial<Lead>): Lead | null => {
  const leads = getLeads();
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

export const getLeadById = (id: string): Lead | null => {
  return getLeads().find((l) => l.id === id) || null;
};
