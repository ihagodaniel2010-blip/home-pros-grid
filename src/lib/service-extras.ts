import { supabase } from "./supabase";

export type ServiceExtra = {
    id: string;
    organization_id: string;
    service_job_id: string;
    estimate_id: string | null;
    description: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    public_token: string | null;
    created_at: string;
};

export const createServiceExtra = async (extraData: {
    organization_id: string;
    service_job_id: string;
    estimate_id?: string;
    description: string;
    amount: number;
}) => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { data, error } = await supabase
        .from('service_extras')
        .insert([{
            ...extraData,
            status: 'pending'
        }])
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
