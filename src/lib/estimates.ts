import { supabase } from "./supabase";

export type EstimateStatus = 'Draft' | 'Sent' | 'Approved' | 'Declined' | 'Expired';

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
    status: EstimateStatus;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    notes?: string;
    terms?: string;
    valid_until?: string;
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
