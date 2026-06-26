import { supabase } from "./supabase";

export const createServiceJob = async (jobData: {
    organization_id: string;
    lead_id: string;
    estimate_id: string;
    status: 'scheduled' | 'in_progress' | 'completed';
    assigned_worker_id?: string;
    address_released_to_worker?: boolean;
}) => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { data, error } = await supabase
        .from('service_jobs')
        .insert([{
            ...jobData,
            address_released_to_worker: jobData.address_released_to_worker ?? false,
        }])
        .select()
        .single();

    if (error) {
        console.error("Error creating service job:", error);
        throw error;
    }

    return data;
};

export const getServiceJobByEstimateId = async (estimateId: string) => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('service_jobs')
        .select('*')
        .eq('estimate_id', estimateId)
        .maybeSingle();

    if (error) {
        console.error("Error getting service job:", error);
        return null;
    }

    return data;
};

export const getServiceJobs = async (organizationId: string) => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('service_jobs')
        .select(`
            id,
            status,
            created_at,
            leads (
                id,
                title
            )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error getting service jobs:", error);
        return [];
    }

    // Map lead title as job title
    return data.map((job: any) => ({
        ...job,
        title: job.leads?.title || `Job #${job.id.slice(0,8)}`
    }));
};
