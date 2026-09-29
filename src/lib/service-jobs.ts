import { supabase } from "./supabase";

export const createServiceJob = async (jobData: {
    organization_id: string;
    lead_id?: string | null;
    estimate_id: string;
    status: 'scheduled' | 'in_progress' | 'completed';
    assigned_worker_id?: string;
    address_released_to_worker?: boolean;
}) => {
    if (!supabase) throw new Error("Supabase not initialized");

    const payload: Record<string, any> = {
        organization_id: jobData.organization_id,
        estimate_id: jobData.estimate_id,
        status: jobData.status,
        address_released_to_worker: jobData.address_released_to_worker ?? false,
    };

    if (jobData.lead_id) payload.lead_id = jobData.lead_id;
    if (jobData.assigned_worker_id) payload.assigned_worker_id = jobData.assigned_worker_id;

    const { data, error } = await supabase
        .from('service_jobs')
        .insert([payload])
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

    // 1. Fetch raw service jobs
    const { data: jobsData, error } = await supabase
        .from('service_jobs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error || !jobsData || jobsData.length === 0) {
        if (error) console.error("Error getting service jobs:", error);
        return [];
    }

    // 2. Fetch linked estimates and leads in batch to build rich client title and address info
    const estimateIds = jobsData.map((j: any) => j.estimate_id).filter(Boolean);
    const leadIds = jobsData.map((j: any) => j.lead_id).filter(Boolean);

    const estimatesMap: Record<string, any> = {};
    const leadsMap: Record<string, any> = {};

    if (estimateIds.length > 0) {
        const { data: ests } = await supabase
            .from('estimates')
            .select('id, client_name, client_address, client_city, client_state, notes, project_type, lead_id')
            .in('id', estimateIds);
        (ests || []).forEach((e: any) => { estimatesMap[e.id] = e; });
    }

    if (leadIds.length > 0) {
        const { data: lds } = await supabase
            .from('leads')
            .select('id, fullName, address, selectedServiceOption')
            .in('id', leadIds);
        (lds || []).forEach((l: any) => { leadsMap[l.id] = l; });
    }

    return jobsData.map((job: any) => {
        const est = job.estimate_id ? estimatesMap[job.estimate_id] : null;
        const leadId = job.lead_id || est?.lead_id;
        const lead = leadId ? leadsMap[leadId] : null;

        const fullName = est?.client_name || lead?.fullName || "Client";
        const firstName = fullName.trim().split(" ")[0] || "Client";

        let address = est?.client_address || lead?.address || "";
        if (!address && est?.notes) {
            const match = est.notes.match(/Client Address:\s*([^\n]+)/i);
            if (match) address = match[1].trim();
        }

        const jobCode = `Job #${job.id.slice(0, 8)}`;
        const shortAddr = address ? address.split(',')[0] : "";
        const formattedTitle = shortAddr 
            ? `${firstName} - ${shortAddr} (${jobCode})`
            : `${firstName} (${jobCode})`;

        return {
            ...job,
            client_name: fullName,
            client_first_name: firstName,
            address: address || "Project Site",
            short_address: shortAddr || "Project Site",
            job_code: jobCode,
            formatted_title: formattedTitle,
            title: job.title || formattedTitle
        };
    });
};
