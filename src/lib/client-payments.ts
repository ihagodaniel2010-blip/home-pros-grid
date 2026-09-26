import { supabase } from "./supabase";

export type PaymentStatus = "draft" | "received" | "cancelled";
export type ReceiptStatus = "draft" | "sent" | "viewed" | "cancelled";
export type PaymentMethod = "cash" | "check" | "zelle" | "venmo" | "card" | "bank_transfer" | "other" | "external_card" | "cash_app";

export interface ClientPayment {
  id: string;
  organization_id: string;
  estimate_id?: string | null;
  service_job_id?: string | null;
  lead_id?: string | null;
  customer_name?: string | null;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  note?: string | null;
  status: PaymentStatus;
  public_token?: string | null;
  receipt_status: ReceiptStatus;
  viewed_at?: string | null;
  sent_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  
  // Joined fields for MVP display
  estimates?: { total_amount: number; title: string } | null;
  service_jobs?: { status: string } | null;
}

export async function getClientPayments(organizationId: string): Promise<ClientPayment[]> {
  const { data, error } = await supabase
    .from("estimate_payments_manual")
    .select(`
      *,
      estimates ( total_amount, title ),
      service_jobs ( status )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching client payments:", error);
    // Para não quebrar a UI antes do SQL 014 ser aplicado:
    if (error.message.includes("does not exist") || error.code === 'PGRST204') {
      return [];
    }
    throw error;
  }

  return data as ClientPayment[];
}

export async function getPublicClientPayments(params: {
  estimateId?: string | null;
  serviceJobId?: string | null;
  leadId?: string | null;
  token?: string | null;
}): Promise<ClientPayment[]> {
  if (!supabase) return [];
  const { estimateId, serviceJobId, leadId, token } = params;

  const cleanToken = (token && token !== 'null' && token !== 'undefined') ? token.trim() : null;

  if (cleanToken) {
    try {
      const { data, error } = await supabase.rpc('get_public_client_payments', { p_token: cleanToken });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as ClientPayment[];
      }
    } catch (rpcErr) {
      console.warn("RPC get_public_client_payments attempt fallback:", rpcErr);
    }
  }

  const cleanJobId = (serviceJobId && serviceJobId !== 'null' && serviceJobId !== 'undefined') ? serviceJobId.trim() : null;
  const cleanEstId = (estimateId && estimateId !== 'null' && estimateId !== 'undefined') ? estimateId.trim() : null;
  const cleanLeadId = (leadId && leadId !== 'null' && leadId !== 'undefined') ? leadId.trim() : null;

  if (!cleanJobId && !cleanEstId && !cleanLeadId) return [];

  try {
    let rawData: any[] = [];
    let query = supabase.from("estimate_payments_manual").select("*");

    if (cleanJobId && cleanEstId) {
      query = query.or(`service_job_id.eq.${cleanJobId},estimate_id.eq.${cleanEstId}`);
    } else if (cleanJobId) {
      query = query.eq("service_job_id", cleanJobId);
    } else if (cleanEstId) {
      query = query.eq("estimate_id", cleanEstId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      rawData = data;
    } else {
      if (cleanJobId) {
        const { data: jPay } = await supabase.from("estimate_payments_manual").select("*").eq('service_job_id', cleanJobId);
        if (jPay) rawData.push(...jPay);
      }
      if (cleanEstId) {
        const { data: ePay } = await supabase.from("estimate_payments_manual").select("*").eq('estimate_id', cleanEstId);
        if (ePay) {
          ePay.forEach(item => {
            if (!rawData.some(r => r.id === item.id)) rawData.push(item);
          });
        }
      }
    }

    return (rawData || []) as ClientPayment[];
  } catch (err) {
    console.error("Exception in getPublicClientPayments:", err);
    return [];
  }
}

export async function createClientPayment(paymentData: Partial<ClientPayment>): Promise<ClientPayment> {
  const public_token = crypto.randomUUID(); // generate random token

  const { data, error } = await supabase
    .from("estimate_payments_manual")
    .insert([{
      ...paymentData,
      public_token,
      status: paymentData.status || "received",
      receipt_status: paymentData.receipt_status || "draft"
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating client payment:", error);
    throw error;
  }

  return data as ClientPayment;
}

export async function updateClientPayment(id: string, updates: Partial<ClientPayment>): Promise<ClientPayment> {
  const { data, error } = await supabase
    .from("estimate_payments_manual")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating client payment:", error);
    throw error;
  }

  return data as ClientPayment;
}

export async function deleteClientPayment(id: string): Promise<void> {
  const { error } = await supabase
    .from("estimate_payments_manual")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("Error deleting client payment:", error);
    throw error;
  }
}

export async function getPublicReceipt(token: string): Promise<any> {
  const { data, error } = await supabase
    .rpc("get_receipt_by_token", { token });

  if (error) {
    console.error("Error fetching public receipt:", error);
    throw error;
  }

  return data;
}
