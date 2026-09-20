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
    if (!supabase || !token) return null;

    // 1. Try public RPC first
    try {
        const { data, error } = await supabase.rpc('get_public_service_extra', { p_token: token });
        if (!error && data && data.length > 0) {
            return data[0];
        }
    } catch (rpcErr) {
        console.warn("RPC get_public_service_extra failed, falling back:", rpcErr);
    }

    // 2. Direct query on service_extras table by public_token, id, service_job_id, or estimate_id
    try {
        const { data: directExtra } = await supabase
            .from('service_extras')
            .select('*')
            .or(`public_token.eq.${token},id.eq.${token},service_job_id.eq.${token},estimate_id.eq.${token}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (directExtra) return directExtra;
    } catch (directErr) {
        console.warn("Direct query service_extras failed:", directErr);
    }

    // 3. Fallback check if token is a lead_id
    try {
        const { data: jobByLead } = await supabase
            .from('service_jobs')
            .select('id, estimate_id')
            .eq('lead_id', token)
            .maybeSingle();

        if (jobByLead) {
            const { data: leadExtra } = await supabase
                .from('service_extras')
                .select('*')
                .or(`service_job_id.eq.${jobByLead.id}${jobByLead.estimate_id ? `,estimate_id.eq.${jobByLead.estimate_id}` : ''}`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (leadExtra) return leadExtra;
        }

        const { data: estByLead } = await supabase
            .from('estimates')
            .select('id')
            .eq('lead_id', token)
            .maybeSingle();

        if (estByLead) {
            const { data: leadExtra } = await supabase
                .from('service_extras')
                .select('*')
                .eq('estimate_id', estByLead.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (leadExtra) return leadExtra;
        }
    } catch (leadErr) {
        console.warn("Lead fallback for extra token failed:", leadErr);
    }

    return null;
};
