import { supabase } from "./supabase";

export type EstimateStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Rejected' | 'Expired' | 'Paid' | 'Partially_Paid';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface EstimateLineItem {
    id?: string;
    estimate_id?: string;
    organization_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at?: string;
}

export interface Estimate {
    id: string;
    organization_id: string;
    lead_id?: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    client_address?: string;
    client_city?: string;
    client_state?: string;
    client_zip?: string;
    status: EstimateStatus;
    project_type?: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    payment_status: PaymentStatus;
    public_token: string;
    notes?: string;
    terms?: string;
    valid_until?: string;
    sent_at?: string;
    approved_at?: string;
    created_at: string;
    updated_at: string;
    items?: EstimateLineItem[];
}

export const getEstimates = async (): Promise<Estimate[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching estimates:', error);
        return [];
    }

    return data as Estimate[];
};

export const getEstimateById = async (id: string): Promise<Estimate | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('estimates')
        .select('*, items:estimate_items(*)')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching estimate:', error);
        return null;
    }

    return data as Estimate;
};

export const createEstimate = async (
    estimate: Omit<Estimate, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<EstimateLineItem, 'id' | 'estimate_id' | 'created_at'>[]
): Promise<Estimate | null> => {
    if (!supabase) return null;

    // 1. Insert Estimate Header
    const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .insert([estimate])
        .select()
        .single();

    if (estimateError) {
        console.error('Error creating estimate:', estimateError);
        return null;
    }

    // 2. Insert Items Linked to the Estimate
    if (items.length > 0) {
        const itemsWithId = items.map(item => ({
            ...item,
            estimate_id: estimateData.id,
            organization_id: estimate.organization_id // Explicitly pass org_id as requested
        }));

        const { error: itemsError } = await supabase
            .from('estimate_items')
            .insert(itemsWithId);

        if (itemsError) {
            console.error('Error creating estimate items:', itemsError);
            // Optional: Logic to delete the estimate header if items fail? 
            // For now, we'll just log and return the header.
        }
    }

    return estimateData as Estimate;
};

export const updateEstimate = async (
    id: string,
    updates: Partial<Estimate>,
    items?: Omit<EstimateLineItem, 'id' | 'estimate_id' | 'created_at'>[]
): Promise<Estimate | null> => {
    if (!supabase) return null;

    // 1. Update Header
    const { data, error } = await supabase
        .from('estimates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating estimate:', error);
        return null;
    }

    // 2. Update Items if provided (Simplistic approach: Delete and Re-insert)
    if (items) {
        // Delete existing
        await supabase.from('estimate_items').delete().eq('estimate_id', id);

        // Insert new
        const itemsToInsert = items.map(item => ({
            ...item,
            estimate_id: id,
            organization_id: data.organization_id
        }));

        const { error: itemsError } = await supabase
            .from('estimate_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Error updating items:', itemsError);
        }
    }

    return data as Estimate;
};

export interface EstimatePayment {
    id?: string;
    organization_id: string;
    estimate_id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    created_at?: string;
}

export const createPayment = async (payment: EstimatePayment): Promise<EstimatePayment | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('estimate_payments')
        .insert([payment])
        .select()
        .single();

    if (error) {
        console.error('Error creating payment:', error);
        return null;
    }

    // Refresh estimate totals (amount_paid / balance_due)
    const { data: payments } = await supabase
        .from('estimate_payments')
        .select('amount')
        .eq('estimate_id', payment.estimate_id);

    if (payments) {
        const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

        // Fetch current estimate to get total_amount
        const { data: est } = await supabase
            .from('estimates')
            .select('total_amount, status')
            .eq('id', payment.estimate_id)
            .single();

        if (est) {
            const balance = est.total_amount - totalPaid;
            let paymentStatus: PaymentStatus = balance <= 0 ? 'paid' : (totalPaid > 0 ? 'partially_paid' : 'unpaid');

            // If fully paid, also update the main status to 'Paid' for convenience, 
            // but keep 'Approved' or others if preferred. The user's request says 
            // "paid" and "partially_paid" are values for the main status too.
            let mainStatus = est.status;
            if (balance <= 0) mainStatus = 'Paid';
            else if (totalPaid > 0) mainStatus = 'Partially_Paid';

            await supabase
                .from('estimates')
                .update({
                    amount_paid: totalPaid,
                    balance_due: balance,
                    payment_status: paymentStatus,
                    status: mainStatus
                })
                .eq('id', payment.estimate_id);
        }
    }

    return data as EstimatePayment;
};

export const getEstimateByToken = async (token: string): Promise<Estimate | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('estimates')
        .select('*, items:estimate_items(*)')
        .eq('public_token', token)
        .single();

    if (error) {
        console.error('Error fetching public estimate:', error);
        return null;
    }

    return data as Estimate;
};

export const approveEstimate = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    const { error } = await supabase
        .from('estimates')
        .update({
            status: 'Approved',
            approved_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error approving estimate:', error);
        return false;
    }

    return true;
};
