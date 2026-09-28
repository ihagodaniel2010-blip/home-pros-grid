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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
    const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : "";
    const verificationToken = typeof body.verificationToken === "string" ? body.verificationToken.trim() : "";

    if (!organizationId || !clientEmail) {
      return NextResponse.json(
        { success: false, message: "Invalid parameters." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Server configuration error (supabaseAdmin uninitialized)." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // --------------------------------------------------------------------------
    // PASSO 1: Validação do JWT do Usuário Autenticado (Staff)
    // --------------------------------------------------------------------------
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

    // --------------------------------------------------------------------------
    // PASSO 2: Conferência de Associação Ativa em organization_users
    // --------------------------------------------------------------------------
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

    // Se o solicitante não for um Staff autenticado E não possuir token de verificação do cliente (OTP)
    if (!isStaffMember && !verificationToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Active Staff session or valid OTP deletion token required." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // --------------------------------------------------------------------------
    // PASSO 3: Invocação da RPC Privilegiada com service_role
    // --------------------------------------------------------------------------
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("delete_client_saved_signature", {
      p_organization_id: organizationId,
      p_client_email: clientEmail,
      p_verification_token: verificationToken || null,
      p_staff_user_id: isStaffMember ? staffUserId : null
    });

    if (rpcErr || !rpcRes) {
      console.error("[Delete Signature API Error] RPC failure:", rpcErr?.message);
      return NextResponse.json(
        { success: false, message: rpcErr?.message || "Could not process signature deletion." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!rpcRes.success) {
      return NextResponse.json(
        { success: false, message: rpcRes.message || "Unauthorized deletion attempt." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: rpcRes.message || "Saved signature deleted from vault." },
      { status: 200, headers: NO_CACHE_HEADERS }
    );

  } catch (error: any) {
    console.error("[Delete Signature API Exception]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error deleting saved signature." },
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
