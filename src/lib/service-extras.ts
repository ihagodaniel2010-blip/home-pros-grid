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
    const generatedToken = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID().replace(/-/g, '')
        : `extra_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload: Record<string, any> = {
        organization_id: extraData.organization_id,
        service_job_id: extraData.service_job_id,
        description: extraData.description,
        amount: extraData.amount,
        previous_contract_price: extraData.previous_contract_price ?? null,
        revised_contract_price: revisedPrice,
        schedule_impact: extraData.schedule_impact ?? null,
        public_token: generatedToken,
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
    if (!supabase || !token) return null;

    // Strict Security Rule: Reject direct UUIDs or Lead IDs passed as public tokens
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    const isLeadId = token.startsWith('lead_');

    if (isUuid || isLeadId) {
        console.warn(`[SECURITY REJECT] Direct ID access attempted on public extra route: ${token}`);
        return null;
    }

    // 1. Try public RPC first
    try {
        const { data, error } = await supabase.rpc('get_public_service_extra', { p_token: token });
        if (!error && data && data.length > 0) {
            return data[0];
        }
    } catch (rpcErr) {
        console.warn("RPC get_public_service_extra failed, falling back:", rpcErr);
    }

    // 2. Direct query on service_extras table strictly by public_token
    try {
        const { data: directExtra } = await supabase
            .from('service_extras')
            .select('*')
            .eq('public_token', token)
            .maybeSingle();

        if (directExtra) return directExtra;
    } catch (directErr) {
        console.warn("Direct query service_extras by public_token failed:", directErr);
    }

    return null;
};
