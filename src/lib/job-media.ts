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
 */
export async function createTemporarySignedUrl(bucket: string, storagePath: string, expiresInSeconds: number = 900): Promise<string | null> {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
        console.error("Error generating signed URL for storage path:", storagePath, error);
        return null;
    }

    return data?.signedUrl || null;
}
