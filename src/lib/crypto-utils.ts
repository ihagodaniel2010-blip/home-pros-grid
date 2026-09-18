/**
 * Crypto utilities for legal document version canonicalization and SHA-256 hashing.
 */

/**
 * Produces a deterministic canonical JSON string for any object.
 * Object keys are recursively sorted lexicographically.
 */
export function canonicalizeJson(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalizeJson).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const keyPairs = sortedKeys.map(key => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`);
    return '{' + keyPairs.join(',') + '}';
}

/**
 * Computes a lowercase 64-character hex SHA-256 hash string for text or ArrayBuffer data.
 */
export async function computeSha256Hex(data: string | ArrayBuffer): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
