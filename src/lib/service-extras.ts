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

/**
 * Extracts embedded [media:URL] tags from text (reason/description) and returns clean text & media URLs.
 */
export function extractMediaFromText(text: string | null | undefined): { cleanText: string; mediaUrls: string[] } {
    if (!text) return { cleanText: '', mediaUrls: [] };
    const mediaUrls: string[] = [];
    if (text.includes('[media:')) {
        const regex = /\[media:([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const url = match[1];
            if (url && !mediaUrls.includes(url)) {
                mediaUrls.push(url);
            }
        }
    }
    const cleanText = text.replace(/\[media:[^\]]+\]/g, '').trim();
    return { cleanText, mediaUrls };
}

/**
 * Returns reason/description text stripped of all embedded [media:...] tags for display or PDF generation.
 */
export function cleanReasonForDisplay(text: string | null | undefined): string {
    return extractMediaFromText(text).cleanText;
}

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

export const getServiceExtrasByJobOrEstimateId = async (jobId?: string | null, estimateId?: string | null, leadId?: string | null) => {
    if (!supabase) return [];

    const cleanJobId = (jobId && jobId !== 'null' && jobId !== 'undefined' && typeof jobId === 'string') ? jobId.trim() : null;
    const cleanEstId = (estimateId && estimateId !== 'null' && estimateId !== 'undefined' && typeof estimateId === 'string') ? estimateId.trim() : null;
    const cleanLeadId = (leadId && leadId !== 'null' && leadId !== 'undefined' && typeof leadId === 'string') ? leadId.trim() : null;

    if (!cleanJobId && !cleanEstId && !cleanLeadId) return [];

    try {
        let rawList: any[] = [];
        let query = supabase.from('service_extras').select('*');

        if (cleanJobId && cleanEstId) {
            query = query.or(`service_job_id.eq.${cleanJobId},estimate_id.eq.${cleanEstId}`);
        } else if (cleanJobId) {
            query = query.eq('service_job_id', cleanJobId);
        } else if (cleanEstId) {
            query = query.eq('estimate_id', cleanEstId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
            rawList = data;
        } else {
            if (cleanJobId) {
                const { data: jData } = await supabase.from('service_extras').select('*').eq('service_job_id', cleanJobId).order('created_at', { ascending: false });
                if (jData) rawList.push(...jData);
            }
            if (cleanEstId) {
                const { data: eData } = await supabase.from('service_extras').select('*').eq('estimate_id', cleanEstId).order('created_at', { ascending: false });
                if (eData) {
                    eData.forEach(item => {
                        if (!rawList.some(r => r.id === item.id)) rawList.push(item);
                    });
                }
            }
        }

        return (rawList || []) as ServiceExtra[];
    } catch (err) {
        console.error("Exception getting service extras:", err);
        return [];
    }
};

export const getPublicServiceExtras = getServiceExtrasByJobOrEstimateId;

export const respondPublicServiceExtra = async (tokenOrId: string, status: 'approved' | 'rejected') => {
    if (!supabase || !tokenOrId) return false;

    // 1. Try public RPC with p_response first (matching PostgreSQL function definition)
    try {
        const { error } = await supabase.rpc('respond_public_service_extra', { 
            p_token: tokenOrId,
            p_response: status
        });

        if (!error) return true;
        console.warn("RPC respond_public_service_extra with p_response returned error:", error.message);
    } catch (rpcErr) {
        console.warn("RPC respond_public_service_extra with p_response failed:", rpcErr);
    }

    // 2. Try public RPC with p_status parameter fallback
    try {
        const { error } = await supabase.rpc('respond_public_service_extra', { 
            p_token: tokenOrId,
            p_status: status
        });

        if (!error) return true;
    } catch (rpcErr2) {
        console.warn("RPC respond_public_service_extra with p_status failed:", rpcErr2);
    }

    // 3. Direct table update fallback by public_token OR id
    try {
        const { error } = await supabase
            .from('service_extras')
            .update({ 
                status, 
                approved_at: status === 'approved' ? new Date().toISOString() : null,
                rejected_at: status === 'rejected' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString() 
            })
            .or(`public_token.eq.${tokenOrId},id.eq.${tokenOrId}`);

        if (!error) return true;
    } catch (updateErr) {
        console.error("Direct update service_extras failed:", updateErr);
    }

    return false;
};

export const getPublicServiceExtra = async (token: string) => {
    if (!supabase || !token) return null;

    if (token.startsWith('lead_')) {
        console.warn(`[SECURITY REJECT] Direct Lead ID access attempted on public extra route: ${token}`);
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

    // 2. Direct query on service_extras table by public_token or id
    try {
        const { data: directExtra } = await supabase
            .from('service_extras')
            .select('*')
            .or(`public_token.eq.${token},id.eq.${token}`)
            .maybeSingle();

        if (directExtra) return directExtra;
    } catch (directErr) {
        console.warn("Direct query service_extras by public_token/id failed:", directErr);
    }

    return null;
};
