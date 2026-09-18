import { supabase } from './supabase';
import { canonicalizeJson, computeSha256Hex } from './crypto-utils';

export type DocumentType = 'estimate' | 'change_order' | 'contract';
export type SignerRole = 'client' | 'contractor';
export type ActorType = 'client' | 'contractor' | 'system';

export interface DocumentVersionSnapshot {
    organization_id: string;
    document_type: DocumentType;
    document_id: string;
    version_number: number;
    contractor_legal_name: string;
    contractor_company_name: string;
    contractor_address?: string;
    contractor_phone?: string;
    contractor_email: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    project_address?: string;
    scope_text: string;
    line_items_json: any[];
    previous_contract_price?: number;
    change_amount?: number;
    subtotal: number;
    tax_rate: number; // e.g. 0.0650 for 6.5%
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    revised_total?: number;
    currency: string;
    schedule_impact?: string;
    terms_text: string;
}

export interface DocumentVersionRecord extends DocumentVersionSnapshot {
    id: string;
    document_hash: string;
    created_at: string;
}

export interface ElectronicSignatureRecord {
    id: string;
    organization_id: string;
    document_type: DocumentType;
    document_id: string;
    document_version_id: string;
    signer_role: SignerRole;
    signer_name: string;
    signer_email: string;
    signed_at: string;
    ip_address: string;
    user_agent: string;
    consent_version: string;
    consent_text: string;
    signature_storage_path: string;
    document_hash: string;
    created_at: string;
}

export interface SignedDocumentArtifactRecord {
    id: string;
    organization_id: string;
    document_type: DocumentType;
    document_id: string;
    document_version_id: string;
    document_hash: string;
    storage_path: string;
    pdf_hash: string;
    generated_at: string;
    created_at: string;
}

/**
 * Creates an immutable document version snapshot record.
 * Computes canonical SHA-256 document hash before persisting.
 */
export async function createDocumentVersionSnapshot(snapshotData: DocumentVersionSnapshot): Promise<DocumentVersionRecord> {
    const canonicalJson = canonicalizeJson(snapshotData);
    const documentHash = await computeSha256Hex(canonicalJson);

    const payload = {
        ...snapshotData,
        document_hash: documentHash
    };

    const { data, error } = await supabase
        .from('document_versions')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error creating document version snapshot:", error);
        throw error;
    }

    return data as DocumentVersionRecord;
}

/**
 * Logs a legal document signature audit event.
 */
export async function logSignatureEvent(eventData: {
    organization_id: string;
    document_type: DocumentType;
    document_id: string;
    document_version_id: string;
    document_hash: string;
    event_type: 'document_created' | 'document_sent' | 'document_viewed' | 'electronic_consent_accepted' | 'signature_started' | 'client_signed' | 'contractor_signed' | 'document_completed' | 'copy_sent';
    actor_type: ActorType;
    actor_name?: string;
    actor_email?: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    const { error } = await supabase
        .from('document_signature_events')
        .insert({
            ...eventData,
            metadata: eventData.metadata || {}
        });

    if (error) {
        console.warn("Failed to log signature audit event:", error);
    }
}

/**
 * Submits an electronic signature record.
 * Server-side / backend handler verifies version, hashes, and captures IP/User-Agent.
 */
export async function submitElectronicSignature(signatureData: {
    organization_id: string;
    document_type: DocumentType;
    document_id: string;
    document_version_id: string;
    signer_role: SignerRole;
    signer_name: string;
    signer_email: string;
    ip_address: string;
    user_agent: string;
    consent_version?: string;
    consent_text: string;
    signature_storage_path: string;
    document_hash: string;
}): Promise<ElectronicSignatureRecord> {
    const payload = {
        ...signatureData,
        consent_version: signatureData.consent_version || 'v1.0_UETA_ESIGN',
        signed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('electronic_signatures')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error inserting electronic signature record:", error);
        throw error;
    }

    // Log corresponding signature event
    const eventType = signatureData.signer_role === 'client' ? 'client_signed' : 'contractor_signed';
    await logSignatureEvent({
        organization_id: signatureData.organization_id,
        document_type: signatureData.document_type,
        document_id: signatureData.document_id,
        document_version_id: signatureData.document_version_id,
        document_hash: signatureData.document_hash,
        event_type: eventType,
        actor_type: signatureData.signer_role,
        actor_name: signatureData.signer_name,
        actor_email: signatureData.signer_email,
        ip_address: signatureData.ip_address,
        user_agent: signatureData.user_agent
    });

    return data as ElectronicSignatureRecord;
}

/**
 * Creates an immutable signed document artifact record once final PDF is generated.
 */
export async function createSignedDocumentArtifact(artifactData: {
    organization_id: string;
    document_type: DocumentType;
    document_id: string;
    document_version_id: string;
    document_hash: string;
    storage_path: string;
    pdf_hash: string;
}): Promise<SignedDocumentArtifactRecord> {
    const { data, error } = await supabase
        .from('signed_document_artifacts')
        .insert({
            ...artifactData,
            generated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating signed document artifact record:", error);
        throw error;
    }

    // Log document completed event
    await logSignatureEvent({
        organization_id: artifactData.organization_id,
        document_type: artifactData.document_type,
        document_id: artifactData.document_id,
        document_version_id: artifactData.document_version_id,
        document_hash: artifactData.document_hash,
        event_type: 'document_completed',
        actor_type: 'system',
        actor_name: 'H&A Construction System'
    });

    return data as SignedDocumentArtifactRecord;
}
