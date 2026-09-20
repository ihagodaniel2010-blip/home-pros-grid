import { supabase } from "./supabase";

export type ServiceExtra = {
    id: string;
    organization_id: string;
    service_job_id: string;
    estimate_id: string | null;
    description: string;
    amount: number; // Change order amount
    previous_contract_price?: number | null;
    revised_contract_price?: number | null;
    schedule_impact?: string | null;
    reason?: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    public_token: string | null;
    created_at: string;
};

export const createServiceExtra = async (extraData: {
    organization_id: string;
    service_job_id: string;
    estimate_id?: string | null;
    description: string;
    amount: number;
    previous_contract_price?: number;
    schedule_impact?: string;
    reason?: string;
}) => {
    if (!supabase) throw new Error("Supabase not initialized");

    const previousPrice = extraData.previous_contract_price ?? 0;
    const revisedPrice = previousPrice + extraData.amount;

    const payload: Record<string, any> = {
        organization_id: extraData.organization_id,
        service_job_id: extraData.service_job_id,
        description: extraData.description,
        amount: extraData.amount,
        previous_contract_price: extraData.previous_contract_price ?? null,
        revised_contract_price: revisedPrice,
        schedule_impact: extraData.schedule_impact ?? null,
        status: 'pending'
    };

    if (extraData.estimate_id) payload.estimate_id = extraData.estimate_id;
    if (extraData.reason) payload.reason = extraData.reason;

    const { data, error } = await supabase
        .from('service_extras')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error("Error creating service extra:", error);
        throw error;
    }

    return data as ServiceExtra;
};

export const getServiceExtrasByJobId = async (jobId: string) => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('service_extras')
        .select('*')
        .eq('service_job_id', jobId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error getting service extras:", error);
        return [];
    }

    return data as ServiceExtra[];
};

export const getServiceExtrasByJobOrEstimateId = async (jobId?: string | null, estimateId?: string | null) => {
    if (!supabase) return [];

    let query = supabase.from('service_extras').select('*');

    if (jobId && estimateId) {
        query = query.or(`service_job_id.eq.${jobId},estimate_id.eq.${estimateId}`);
    } else if (jobId) {
        query = query.eq('service_job_id', jobId);
    } else if (estimateId) {
        query = query.eq('estimate_id', estimateId);
    } else {
        return [];
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Error getting service extras:", error);
        return [];
    }

    return data as ServiceExtra[];
};

export const respondPublicServiceExtra = async (token: string, status: 'approved' | 'rejected') => {
    if (!supabase) return false;

    const { error } = await supabase.rpc('respond_public_service_extra', { 
        p_token: token,
        p_status: status
    });

    if (error) {
        console.error("Error responding to service extra via RPC:", error);
        return false;
    }

    return true;
};

export const getPublicServiceExtra = async (token: string) => {
    if (!supabase) return null;

    const { data, error } = await supabase.rpc('get_public_service_extra', { p_token: token });

    if (error || !data || data.length === 0) {
        console.error("Error getting public service extra via RPC:", error);
        return null;
    }

    return data[0];
};
