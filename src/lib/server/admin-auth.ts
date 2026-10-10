import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { ALLOWED_ADMIN_EMAILS } from "@/lib/admin-allowlist";

export interface AdminAuthVerification {
  isAuthed: boolean;
  isAllowed: boolean;
  user: any | null;
  status: number;
  error?: string;
}

/**
 * Server-side authentication and authorization check for Next.js API routes under /api/admin/*.
 * Validates the Supabase Auth session token and verifies the email is in the admin allowlist.
 */
export async function verifyAdminAuth(request: Request): Promise<AdminAuthVerification> {
  const db = supabaseAdmin;
  if (!db) {
    return {
      isAuthed: false,
      isAllowed: false,
      user: null,
      status: 500,
      error: "Server configuration error: Database service_role client is unavailable."
    };
  }

  // 1. Extract Bearer token from Authorization header or cookies
  let token = "";
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/) || cookieHeader.match(/sb_access_token=([^;]+)/);
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        token = parsed.access_token || (Array.isArray(parsed) ? parsed[0] : parsed);
      } catch {
        token = match[1];
      }
    }
  }

  if (!token) {
    return {
      isAuthed: false,
      isAllowed: false,
      user: null,
      status: 401,
      error: "Unauthenticated: Missing Authorization Bearer token or session cookie."
    };
  }

  try {
    // 2. Validate token against Supabase Auth
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) {
      return {
        isAuthed: false,
        isAllowed: false,
        user: null,
        status: 401,
        error: "Unauthenticated: Invalid or expired authentication token."
      };
    }

    // 3. Verify user email against ALLOWED_ADMIN_EMAILS allowlist
    const userEmail = (user.email || "").trim().toLowerCase();
    const isAllowed = ALLOWED_ADMIN_EMAILS.includes(userEmail);

    if (!isAllowed) {
      return {
        isAuthed: true,
        isAllowed: false,
        user,
        status: 403,
        error: `Forbidden (HTTP 403): Account '${userEmail}' is not authorized for administrative access.`
      };
    }

    return {
      isAuthed: true,
      isAllowed: true,
      user,
      status: 200
    };
  } catch (err: any) {
    console.error("[SERVER ADMIN AUTH VERIFICATION ERROR]", err);
    return {
      isAuthed: false,
      isAllowed: false,
      user: null,
      status: 500,
      error: err.message || "Internal error verifying administrative session."
    };
  }
}
