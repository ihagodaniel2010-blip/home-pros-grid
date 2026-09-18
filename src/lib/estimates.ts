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
    files?: any[];
}

export const getEstimates = async (organizationId?: string): Promise<Estimate[]> => {
    if (!supabase) return [];

    let query = supabase.from('estimates').select('*');
    if (organizationId) {
        query = query.eq('organization_id', organizationId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

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

const ALLOWED_ESTIMATE_COLUMNS = new Set([
    'organization_id',
    'lead_id',
    'client_name',
    'client_email',
    'client_phone',
    'project_type',
    'status',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'discount_amount',
    'total_amount',
    'amount_paid',
    'balance_due',
    'payment_status',
    'public_token',
    'notes',
    'terms',
    'valid_until',
    'sent_at',
    'approved_at'
]);

const ALLOWED_ESTIMATE_ITEM_COLUMNS = new Set([
    'estimate_id',
    'organization_id',
    'description',
    'quantity',
    'unit_price'
]);

export function sanitizeEstimatePayload(raw: Record<string, any>): Record<string, any> {
    const cleanPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (ALLOWED_ESTIMATE_COLUMNS.has(key) && value !== undefined) {
            cleanPayload[key] = value;
        }
    }

    // Preserve address in notes if address fields are provided and notes doesn't already contain address
    const addressParts = [raw.client_address, raw.client_city, raw.client_state, raw.client_zip].filter(Boolean);
    if (addressParts.length > 0) {
        const addressStr = addressParts.join(', ');
        const existingNotes = cleanPayload.notes || '';
        if (!existingNotes.includes(addressStr)) {
            cleanPayload.notes = existingNotes 
                ? `${existingNotes}\n\nClient Address: ${addressStr}`
                : `Client Address: ${addressStr}`;
        }
    }

    return cleanPayload;
}

export function sanitizeEstimateItemPayload(raw: Record<string, any>): Record<string, any> {
    const cleanPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (ALLOWED_ESTIMATE_ITEM_COLUMNS.has(key) && value !== undefined) {
            cleanPayload[key] = value;
        }
    }
    return cleanPayload;
}

export const createEstimate = async (
    estimate: Omit<Estimate, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<EstimateLineItem, 'id' | 'estimate_id' | 'created_at'>[]
): Promise<Estimate | null> => {
    if (!supabase) return null;

    const sanitizedHeader = sanitizeEstimatePayload(estimate as any);

    // 1. Insert Estimate Header
    const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .insert([sanitizedHeader])
        .select()
        .single();

    if (estimateError) {
        console.error('Error creating estimate header:', estimateError);
        throw estimateError;
    }

    // 2. Insert Items Linked to the Estimate
    if (items.length > 0) {
        const itemsWithId = items.map(item => sanitizeEstimateItemPayload({
            ...item,
            estimate_id: estimateData.id,
            organization_id: estimateData.organization_id || estimate.organization_id
        }));

        const { error: itemsError } = await supabase
            .from('estimate_items')
            .insert(itemsWithId);

        if (itemsError) {
            console.error('Error creating estimate items:', itemsError);
            throw itemsError;
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

    const sanitizedUpdates = sanitizeEstimatePayload(updates as any);

    // 1. Update Header
    const { data, error } = await supabase
        .from('estimates')
        .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating estimate:', error);
        throw error;
    }

    // 2. Update Items if provided (Delete and Re-insert)
    if (items) {
        await supabase.from('estimate_items').delete().eq('estimate_id', id);

        if (items.length > 0) {
            const itemsToInsert = items.map(item => sanitizeEstimateItemPayload({
                ...item,
                estimate_id: id,
                organization_id: data.organization_id
            }));

            const { error: itemsError } = await supabase
                .from('estimate_items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error('Error updating items:', itemsError);
                throw itemsError;
            }
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

    // Call public RPC for estimate header
    const { data: estimate, error: estimateError } = await supabase
        .rpc('get_public_estimate', { p_token: token });

    if (estimateError || !estimate) {
        console.error('Error fetching public estimate:', estimateError);
        return null;
    }

    // Call public RPC for estimate items
    const { data: items, error: itemsError } = await supabase
        .rpc('get_public_estimate_items', { p_token: token });

    if (itemsError) {
        console.error('Error fetching public estimate items:', itemsError);
    }

    // Call public RPC for estimate files
    let files: any[] = [];
    try {
        const { data: filesData, error: filesError } = await supabase
            .rpc('get_public_estimate_files', { p_token: token });
        if (!filesError && filesData) {
            files = filesData;
        }
    } catch (e) {
        console.warn('get_public_estimate_files RPC may not exist:', e);
    }

    return {
        ...estimate,
        items: items || [],
        files
    } as Estimate;
};

export const approveEstimate = async (id: string, token?: string): Promise<boolean> => {
    if (!supabase) return false;

    if (token) {
        const { error } = await supabase.rpc('approve_public_estimate', { p_token: token });
        if (error) {
            console.error('Error approving estimate via RPC:', error);
            return false;
        }
        return true;
    }

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

export const rejectEstimate = async (id: string, token?: string): Promise<boolean> => {
    if (!supabase) return false;

    if (token) {
        const { error } = await supabase.rpc('reject_public_estimate', { p_token: token });
        if (error) {
            console.error('Error rejecting estimate via RPC:', error);
            return false;
        }
        return true;
    }

    const { error } = await supabase
        .from('estimates')
        .update({
            status: 'Rejected',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error rejecting estimate:', error);
        return false;
    }

    return true;
};
