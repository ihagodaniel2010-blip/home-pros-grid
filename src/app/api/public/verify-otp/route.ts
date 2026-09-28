import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

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
    const estimateId = typeof body.estimateId === "string" ? body.estimateId.trim() : "";
    const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : "";
    const otpCode = typeof body.otpCode === "string" ? body.otpCode.trim() : "";

    if (!organizationId || !estimateId || !clientEmail || !otpCode || otpCode.length !== 6) {
      return NextResponse.json(
        { success: false, message: "Invalid parameters. Please provide a valid 6-digit verification code." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Server configuration error (supabaseAdmin uninitialized)." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Call service_role RPC to verify salted SHA-256 OTP hash
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("verify_client_signature_otp", {
      p_organization_id: organizationId,
      p_estimate_id: estimateId,
      p_client_email: clientEmail,
      p_otp_code: otpCode
    });

    if (rpcErr || !rpcRes) {
      console.error("[Verify OTP API Error] RPC failure:", rpcErr?.message);
      return NextResponse.json(
        { success: false, message: rpcErr?.message || "Server error verifying code." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!rpcRes.success) {
      return NextResponse.json(
        { success: false, message: rpcRes.message || "Invalid or expired verification code." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // If storage path returned, create a 5-minute temporary signed URL from private 'signatures' bucket
    let sigDataUrl = "";
    if (rpcRes.signature_storage_path) {
      try {
        const { data: signedData } = await supabaseAdmin.storage
          .from("signatures")
          .createSignedUrl(rpcRes.signature_storage_path, 300);
        
        if (signedData?.signedUrl) {
          sigDataUrl = signedData.signedUrl;
        }
      } catch (sErr) {
        console.warn("[Verify OTP API Warning] Signed URL generation notice:", sErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        verificationToken: rpcRes.verification_token,
        signatureDataUrl: sigDataUrl || rpcRes.signature_data_url || "",
        signatureType: rpcRes.signature_type || "drawn",
        signerName: rpcRes.signer_name || "",
        signerEmail: rpcRes.signer_email || clientEmail
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );

  } catch (error: any) {
    console.error("[Verify OTP API Exception]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error verifying OTP code." },
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
