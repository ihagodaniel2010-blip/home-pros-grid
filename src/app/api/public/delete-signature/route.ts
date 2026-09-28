import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { createClient } from "@supabase/supabase-js";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid request payload." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
    const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : "";
    const verificationToken = typeof body.verificationToken === "string" ? body.verificationToken.trim() : "";

    if (!organizationId || !clientEmail) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter configuration." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Server configuration error." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Validate Staff JWT user session from Authorization bearer token
    let staffUserId: string | null = null;
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (supabaseUrl && supabaseAnonKey && token) {
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
        if (user && !authErr) {
          staffUserId = user.id;
        }
      }
    }

    // 2. Defense in Depth: Pre-check Staff active organization membership
    let isStaffMember = false;
    if (staffUserId) {
      const { data: staffOrgRecord } = await supabaseAdmin
        .from("organization_users")
        .select("status")
        .eq("user_id", staffUserId)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .maybeSingle();

      if (staffOrgRecord && staffOrgRecord.status === "active") {
        isStaffMember = true;
      }
    }

    if (!isStaffMember && !verificationToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized request." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Execute privileged deletion RPC via service_role
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("delete_client_saved_signature", {
      p_organization_id: organizationId,
      p_client_email: clientEmail,
      p_verification_token: verificationToken || null,
      p_staff_user_id: isStaffMember ? staffUserId : null
    });

    if (rpcErr || !rpcRes) {
      console.error("[Delete Signature API Error] Internal RPC failure:", rpcErr);
      return NextResponse.json(
        { success: false, message: "Unable to process signature deletion request." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!rpcRes.success) {
      return NextResponse.json(
        { success: false, message: rpcRes.message || "Unauthorized request." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Consistent Physical Storage File Removal
    const storagePath = rpcRes.signature_storage_path;
    let storageErrorMsg: string | null = null;

    if (storagePath && typeof storagePath === "string" && storagePath.trim() !== "") {
      try {
        const { error: storageErr } = await supabaseAdmin
          .storage
          .from("signatures")
          .remove([storagePath.trim()]);
        
        if (storageErr) {
          console.error("[Delete Signature Storage Error] Physical removal failed:", storageErr);
          storageErrorMsg = storageErr.message || "Failed to remove physical storage asset";
        }
      } catch (stEx: any) {
        console.error("[Delete Signature Storage Exception]", stEx);
        storageErrorMsg = stEx?.message || "Storage exception during physical file removal";
      }
    }

    // If physical storage file removal failed, do NOT return full success! Log cleanup pending and report partial error.
    if (storageErrorMsg) {
      console.warn(`[Delete Signature Warning] DB record deleted for ${clientEmail}, but storage removal failed: ${storagePath}`);
      
      // Explicitly log cleanup_pending event with factual staff actor_type
      await supabaseAdmin.from("document_signature_events").insert({
        organization_id: organizationId,
        document_type: "client_saved_signature",
        document_id: rpcRes.signature_id || organizationId,
        event_type: "storage_cleanup_pending",
        actor_type: isStaffMember ? "staff" : "client",
        actor_email: clientEmail,
        metadata: {
          action: "storage_cleanup_pending",
          storage_path: storagePath,
          error: storageErrorMsg,
          staff_user_id: isStaffMember ? staffUserId : null,
          auth_method: isStaffMember ? "staff_session" : "email_otp"
        }
      });

      return NextResponse.json(
        { 
          success: false, 
          message: "Signature record removed from database, but physical file deletion failed. Storage cleanup has been flagged.",
          cleanup_pending: true 
        },
        { status: 207, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: "Saved reusable signature and physical storage file deleted successfully." },
      { status: 200, headers: NO_CACHE_HEADERS }
    );

  } catch (error: any) {
    console.error("[Delete Signature API Exception]", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while deleting saved signature." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST with JSON body." },
    { status: 405, headers: NO_CACHE_HEADERS }
  );
}
