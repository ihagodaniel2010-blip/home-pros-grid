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

export function autoCategorizePhoto(caption?: string, fileName?: string, projectType?: string): string {
    const text = `${caption || ''} ${fileName || ''} ${projectType || ''}`.toLowerCase();
    
    if (/framing|estrutura|madeira|joist|beam|stud|barrote/i.test(text)) return "Framing & Structure";
    if (/roof|telhado|calha|gutter|shingle|fascia|soffit/i.test(text)) return "Roofing & Gutters";
    if (/drywall|gesso|sheetrock|wall|parede|teto/i.test(text)) return "Drywall & Painting";
    if (/siding|revestimento|facade|exterior|cladding/i.test(text)) return "Siding & Exterior";
    if (/deck|porch|patio|varanda|decking|rail/i.test(text)) return "Decks & Patios";
    if (/remodel|reforma|kitchen|bath|cozinha|banheiro|tile|flooring/i.test(text)) return "Remodeling";
    return "Construction Progress";
}

/**
 * Uploads a job photo or video adhering to canonical path structure:
 * {organization_id}/jobs/{service_job_id}/photos/{uuid}.jpg
 * {organization_id}/jobs/{service_job_id}/videos/{uuid}.mp4
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
    visible_to_client?: boolean;
    visible_on_public_site?: boolean;
    portfolio_approved?: boolean;
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
        visible_to_client: params.visible_to_client ?? true,
        visible_on_public_site: params.visible_on_public_site ?? true,
        portfolio_approved: params.portfolio_approved ?? false,
        media_status: params.portfolio_approved ? 'approved' : 'pending'
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

export interface PublicPortfolioShowcaseItem {
    id: string;
    media_type: MediaType;
    file_name?: string;
    caption?: string | null;
    signedUrl: string;
    category: string;
    created_at: string;
}

export async function getPublicPortfolioShowcase(): Promise<PublicPortfolioShowcaseItem[]> {
    try {
        const res = await fetch('/api/public/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'public', type: 'portfolio', id: 'all' }),
            cache: 'no-store'
        });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.portfolio)) {
                return data.portfolio;
            }
        }
    } catch (err) {
        console.warn("getPublicPortfolioShowcase API error:", err);
    }

    // Fallback via RPC get_public_portfolio_media
    try {
        const rpcItems = await getPublicPortfolioMedia();
        if (Array.isArray(rpcItems) && rpcItems.length > 0) {
            const resolved = await Promise.all(
                rpcItems.map(async (item: any) => {
                    const signedUrl = item.storage_path ? await resolveSignedMediaUrl(item.storage_path) : null;
                    return {
                        id: item.id,
                        media_type: item.media_type || 'image',
                        file_name: item.file_name,
                        caption: item.caption,
                        signedUrl: signedUrl || '',
                        category: autoCategorizePhoto(item.caption, item.file_name),
                        created_at: item.created_at
                    };
                })
            );
            return resolved.filter(i => !!i.signedUrl);
        }
    } catch (rpcErr) {
        console.warn("getPublicPortfolioShowcase RPC fallback error:", rpcErr);
    }

    return [];
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
    
    // If inline Base64 Data URI, return directly so fallback uploads display properly
    if (storagePath.startsWith('data:')) {
        return storagePath;
    }

    let targetBucket = 'images';
    let cleanPath = storagePath;

    // Handle full URLs
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        if (storagePath.includes('/storage/v1/object/')) {
            const parts = storagePath.split('/storage/v1/object/')[1]?.split('/');
            if (parts && parts.length >= 3) {
                targetBucket = parts[1];
                cleanPath = parts.slice(2).join('/');
            } else {
                return null;
            }
        } else {
            // STRICT SECURITY RULE: External HTTP links cannot be signed via SDK, return null for admin review
            return null;
        }
    } else {
        // Clean relative path if bucket prefix was included
        if (storagePath.startsWith('documents/')) {
            cleanPath = storagePath.slice(10);
            targetBucket = 'documents';
        } else if (storagePath.startsWith('images/')) {
            cleanPath = storagePath.slice(7);
            targetBucket = 'images';
        } else if (storagePath.startsWith('receipts/')) {
            cleanPath = storagePath.slice(9);
            targetBucket = 'receipts';
        }
    }

    const signedUrl = await createTemporarySignedUrl(targetBucket, cleanPath, 300);
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
 * Fetches public client-visible job media records for a given service job ID.
 */
export interface PublicSignedMediaUrlResult {
    signedUrl: string | null;
    status: 'success' | 'no_file' | 'legacy_unavailable' | 'unauthorized' | 'storage_error' | 'error';
    errorMessage?: string;
}

export async function fetchPublicSignedMediaUrl(token: string, mediaId: string): Promise<PublicSignedMediaUrlResult> {
    if (!token || !mediaId) return { signedUrl: null, status: 'error', errorMessage: 'Invalid parameters' };
    try {
        const res = await fetch('/api/public/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, type: 'media', id: mediaId }),
            cache: 'no-store'
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.signedUrl) {
            return { signedUrl: data.signedUrl, status: 'success' };
        }
        if (res.status === 422 || data.unavailable) {
            return { signedUrl: null, status: 'legacy_unavailable', errorMessage: data.error };
        }
        if (res.status === 403) {
            return { signedUrl: null, status: 'unauthorized', errorMessage: data.error };
        }
        if (res.status === 404) {
            return { signedUrl: null, status: 'storage_error', errorMessage: data.error };
        }
        return { signedUrl: null, status: 'error', errorMessage: data.error || 'Server error' };
    } catch (e: any) {
        console.warn("fetchPublicSignedMediaUrl error:", e);
        return { signedUrl: null, status: 'error', errorMessage: e.message };
    }
}

export async function getPublicSignedMediaUrl(token: string, mediaId: string): Promise<string | null> {
    const res = await fetchPublicSignedMediaUrl(token, mediaId);
    return res.signedUrl;
}

export const getPublicMediaUrl = getPublicSignedMediaUrl;

export async function getPublicJobMediaByJobId(
    serviceJobId?: string | null,
    estimateId?: string | null,
    token?: string | null
): Promise<ServiceJobMediaRecord[]> {
    if (!supabase) return [];

    const cleanToken = (token && token !== 'null' && token !== 'undefined') ? token.trim() : null;

    if (cleanToken) {
        // 1. Try server-side route POST /api/public/signed-url with type: "list_media"
        try {
            const res = await fetch('/api/public/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: cleanToken, type: 'list_media', id: 'all' }),
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.media)) {
                    return (data.media as any[]).map(item => ({
                        ...item,
                        estimate_id: estimateId || null,
                        visible_to_client: true,
                        visible_on_public_site: true,
                        portfolio_approved: false,
                        media_status: 'approved',
                        sort_order: 0,
                        updated_at: item.created_at || new Date().toISOString()
                    })) as ServiceJobMediaRecord[];
                }
            }
        } catch (apiErr) {
            console.warn("API /api/public/signed-url list_media attempt fallback:", apiErr);
        }

        // 2. Fallback to RPC get_public_job_media
        try {
            const { data, error } = await supabase.rpc('get_public_job_media', { p_token: cleanToken });
            if (!error && Array.isArray(data)) {
                return (data as any[]).map(item => ({
                    ...item,
                    visible_to_client: item.visible_to_client ?? true,
                    visible_on_public_site: true,
                    portfolio_approved: false,
                    media_status: 'approved',
                    sort_order: 0,
                    updated_at: item.created_at || new Date().toISOString()
                })) as ServiceJobMediaRecord[];
            }
        } catch (rpcErr) {
            console.warn("RPC get_public_job_media attempt fallback:", rpcErr);
        }
    }
    
    const cleanJobId = (serviceJobId && serviceJobId !== 'null' && serviceJobId !== 'undefined') ? serviceJobId.trim() : null;
    const cleanEstId = (estimateId && estimateId !== 'null' && estimateId !== 'undefined') ? estimateId.trim() : null;

    let targetJobId = cleanJobId;
    if (!targetJobId && cleanEstId) {
        try {
            const { data: jData } = await supabase.from('service_jobs').select('id').eq('estimate_id', cleanEstId).maybeSingle();
            if (jData?.id) targetJobId = jData.id;
        } catch (e) {}
    }

    if (!targetJobId) return [];

    try {
        const { data, error } = await supabase
            .from('service_job_media')
            .select('*')
            .eq('service_job_id', targetJobId)
            .eq('visible_to_client', true)
            .order('created_at', { ascending: false });

        if (!error && data) {
            return data as ServiceJobMediaRecord[];
        }
        return [];
    } catch (err) {
        console.error("Exception in getPublicJobMediaByJobId:", err);
        return [];
    }
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

/**
 * Checks if an extra media storage path is currently published as client-visible in service_job_media.
 */
export async function isExtraMediaPublishedToGallery(
    serviceJobId: string,
    storagePath: string
): Promise<boolean> {
    if (!supabase || !serviceJobId || !storagePath) return false;
    try {
        const { data, error } = await supabase
            .from('service_job_media')
            .select('id, visible_to_client')
            .eq('service_job_id', serviceJobId)
            .eq('storage_path', storagePath)
            .eq('visible_to_client', true);

        if (error || !data) return false;
        return data.length > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Toggles explicit publication of an Extra media item into the Client Project Gallery (service_job_media).
 * - Publish: Creates or updates reference in service_job_media with visible_to_client = true without duplicating bytes.
 * - Unpublish: Removes or sets visible_to_client = false in service_job_media, preserving service_extra_media.
 */
export async function toggleExtraMediaGalleryPublication(params: {
    organizationId: string;
    serviceJobId: string;
    extraMedia: ServiceExtraMediaRecord;
    publish: boolean;
}): Promise<boolean> {
    if (!supabase) return false;
    const { organizationId, serviceJobId, extraMedia, publish } = params;

    try {
        const { data: existingRecords } = await supabase
            .from('service_job_media')
            .select('*')
            .eq('service_job_id', serviceJobId)
            .eq('storage_path', extraMedia.storage_path);

        const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

        if (publish) {
            if (existing) {
                const { error: updateErr } = await supabase
                    .from('service_job_media')
                    .update({
                        visible_to_client: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (updateErr) {
                    console.error("Error updating service_job_media visibility:", updateErr);
                    return false;
                }
            } else {
                const payload = {
                    organization_id: organizationId,
                    service_job_id: serviceJobId,
                    media_type: extraMedia.media_type || 'image',
                    storage_path: extraMedia.storage_path,
                    file_name: extraMedia.file_name || 'extra_media.jpg',
                    mime_type: extraMedia.mime_type || 'image/jpeg',
                    file_size_bytes: extraMedia.file_size_bytes || 0,
                    caption: extraMedia.caption || 'Change Order Photo',
                    visible_to_client: true,
                    visible_on_public_site: true,
                    portfolio_approved: false,
                    media_status: 'approved'
                };

                const { error: insertErr } = await supabase
                    .from('service_job_media')
                    .insert(payload);

                if (insertErr) {
                    console.error("Error inserting service_job_media reference:", insertErr);
                    return false;
                }
            }
            return true;
        } else {
            if (existing) {
                const { error: deleteErr } = await supabase
                    .from('service_job_media')
                    .delete()
                    .eq('id', existing.id);

                if (deleteErr) {
                    console.error("Error deleting service_job_media reference:", deleteErr);
                    return false;
                }
            }
            return true;
        }
    } catch (err) {
        console.error("Exception in toggleExtraMediaGalleryPublication:", err);
        return false;
    }
}


