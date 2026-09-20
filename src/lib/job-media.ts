import { supabase } from './supabase';

export type MediaType = 'image' | 'video';
export type MediaStatus = 'pending' | 'approved' | 'rejected';

export interface ServiceJobMediaRecord {
    id: string;
    organization_id: string;
    service_job_id: string;
    media_type: MediaType;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    duration_seconds?: number | null;
    caption?: string | null;
    sort_order: number;
    visible_to_client: boolean;
    visible_on_public_site: boolean;
    portfolio_approved: boolean;
    media_status: MediaStatus;
    uploaded_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ServiceExtraMediaRecord {
    id: string;
    organization_id: string;
    service_extra_id: string;
    media_type: MediaType;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    duration_seconds?: number | null;
    caption?: string | null;
    uploaded_by?: string | null;
    created_at: string;
}

/**
 * Uploads a job photo or video adhering to canonical path structure:
 * {organization_id}/jobs/{service_job_id}/photos/{uuid}.jpg
 * {organization_id}/jobs/{service_job_id}/videos/{uuid}.mp4
 * Default visibility: PRIVATE (`visible_to_client = false`, `visible_on_public_site = false`, `portfolio_approved = false`)
 */
export async function uploadJobMediaRecord(params: {
    organization_id: string;
    service_job_id: string;
    media_type: MediaType;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    duration_seconds?: number;
    caption?: string;
}): Promise<ServiceJobMediaRecord> {
    const payload = {
        organization_id: params.organization_id,
        service_job_id: params.service_job_id,
        media_type: params.media_type,
        storage_path: params.storage_path,
        file_name: params.file_name,
        mime_type: params.mime_type,
        file_size_bytes: params.file_size_bytes,
        duration_seconds: params.duration_seconds || null,
        caption: params.caption || null,
        visible_to_client: false,
        visible_on_public_site: false,
        portfolio_approved: false,
        media_status: 'pending'
    };

    const { data, error } = await supabase
        .from('service_job_media')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error inserting service job media record:", error);
        throw error;
    }

    return data as ServiceJobMediaRecord;
}

/**
 * Double-lock Portfolio Approval for public site visibility.
 * Requires Owner/Admin rights.
 */
export async function approveMediaForPortfolio(mediaId: string, approve: boolean): Promise<void> {
    const { error } = await supabase
        .from('service_job_media')
        .update({
            visible_on_public_site: approve,
            portfolio_approved: approve,
            media_status: approve ? 'approved' : 'pending',
            updated_at: new Date().toISOString()
        })
        .eq('id', mediaId);

    if (error) {
        console.error("Error updating portfolio approval for media:", error);
        throw error;
    }
}

/**
 * Fetches authorized client-visible job media metadata via hardened SECURITY DEFINER RPC.
 */
export async function getClientJobMediaByToken(jobToken: string) {
    const { data, error } = await supabase
        .rpc('get_client_job_media', { p_job_token: jobToken });

    if (error) {
        console.error("Error fetching client job media via RPC:", error);
        throw error;
    }

    return data || [];
}

/**
 * Fetches public portfolio media metadata via hardened SECURITY DEFINER RPC.
 */
export async function getPublicPortfolioMedia() {
    const { data, error } = await supabase
        .rpc('get_public_portfolio_media');

    if (error) {
        console.error("Error fetching public portfolio media via RPC:", error);
        throw error;
    }

    return data || [];
}

/**
 * Generates a short-lived signed URL (default 15 minutes) for a private storage asset.
 * Tries 'images' bucket first, then 'documents' bucket as fallback.
 */
export async function createTemporarySignedUrl(bucket: string, storagePath: string, expiresInSeconds: number = 900): Promise<string | null> {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
        console.warn("Error generating signed URL for storage path:", storagePath, "in bucket:", bucket, error.message);
        return null;
    }

    return data?.signedUrl || null;
}

/**
 * Resolves a signed or public URL for any media storage path cleanly.
 */
export async function resolveSignedMediaUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('data:')) {
        return storagePath;
    }

    // Clean relative path if bucket prefix was included
    let cleanPath = storagePath;
    let targetBucket = 'images';
    if (storagePath.startsWith('documents/')) {
        cleanPath = storagePath.replace('documents/', '');
        targetBucket = 'documents';
    } else if (storagePath.startsWith('images/')) {
        cleanPath = storagePath.replace('images/', '');
        targetBucket = 'images';
    }

    let signedUrl = await createTemporarySignedUrl(targetBucket, cleanPath, 3600);
    if (!signedUrl && targetBucket === 'images') {
        // Fallback to documents bucket
        signedUrl = await createTemporarySignedUrl('documents', cleanPath, 3600);
    }
    if (!signedUrl) {
        // Try public URL as last resort
        const { data } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
        if (data?.publicUrl) signedUrl = data.publicUrl;
    }

    return signedUrl;
}

/**
 * Fetches all job media records for a given service job ID.
 */
export async function getJobMediaRecords(serviceJobId: string): Promise<ServiceJobMediaRecord[]> {
    const { data, error } = await supabase
        .from('service_job_media')
        .select('*')
        .eq('service_job_id', serviceJobId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching job media records:", error);
        throw error;
    }

    return (data || []) as ServiceJobMediaRecord[];
}

/**
 * Deletes a job media record from the database.
 */
export async function deleteJobMediaRecord(mediaId: string): Promise<void> {
    const { error } = await supabase
        .from('service_job_media')
        .delete()
        .eq('id', mediaId);

    if (error) {
        console.error("Error deleting job media record:", error);
        throw error;
    }
}

/**
 * Updates visibility and approval flags for a job media record.
 */
export async function updateJobMediaVisibility(
    mediaId: string,
    updates: {
        visible_to_client?: boolean;
        visible_on_public_site?: boolean;
        portfolio_approved?: boolean;
    }
): Promise<void> {
    const payload: Record<string, any> = {
        updated_at: new Date().toISOString()
    };

    if (typeof updates.visible_to_client === 'boolean') payload.visible_to_client = updates.visible_to_client;
    if (typeof updates.visible_on_public_site === 'boolean') payload.visible_on_public_site = updates.visible_on_public_site;
    if (typeof updates.portfolio_approved === 'boolean') payload.portfolio_approved = updates.portfolio_approved;

    const { error } = await supabase
        .from('service_job_media')
        .update(payload)
        .eq('id', mediaId);

    if (error) {
        console.error("Error updating job media visibility:", error);
        throw error;
    }
}

/**
 * Uploads a service extra photo or video media record.
 */
export async function uploadExtraMediaRecord(params: {
    organization_id: string;
    service_extra_id: string;
    media_type: MediaType;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    caption?: string;
}): Promise<ServiceExtraMediaRecord> {
    const payload = {
        organization_id: params.organization_id,
        service_extra_id: params.service_extra_id,
        media_type: params.media_type,
        storage_path: params.storage_path,
        file_name: params.file_name,
        mime_type: params.mime_type,
        file_size_bytes: params.file_size_bytes,
        caption: params.caption || null
    };

    const { data, error } = await supabase
        .from('service_extra_media')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error inserting service extra media record:", error);
        throw error;
    }

    return data as ServiceExtraMediaRecord;
}

/**
 * Fetches all media records for a specific service extra.
 */
export async function getExtraMediaRecords(serviceExtraId: string): Promise<ServiceExtraMediaRecord[]> {
    const { data, error } = await supabase
        .from('service_extra_media')
        .select('*')
        .eq('service_extra_id', serviceExtraId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching extra media records:", error);
        return [];
    }

    return (data || []) as ServiceExtraMediaRecord[];
}

