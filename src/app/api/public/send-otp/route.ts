import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { attachSocialFooterToHtml } from "@/lib/server/emailProvider";

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

    if (!organizationId || !estimateId || !clientEmail || !clientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter inputs provided." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Server configuration error (supabaseAdmin uninitialized)." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Call server-side RPC to generate and hash OTP
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("request_client_signature_otp", {
      p_organization_id: organizationId,
      p_estimate_id: estimateId,
      p_client_email: clientEmail
    });

    if (rpcErr || !rpcRes) {
      console.error("[Send OTP API Error] RPC failure:", rpcErr?.message);
      // Factual generic message to avoid leaking user info or vault presence
      return NextResponse.json(
        { success: true, message: "If a saved signature exists for this recipient, a verification code was sent." },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    if (!rpcRes.success) {
      return NextResponse.json(
        { success: false, message: rpcRes.message || "Could not process verification code request." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const otpCodeToSend = rpcRes.otp_to_send;
    const recipientEmail = clientEmail;

    // Send OTP email via Resend API if API Key is configured in environment
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && otpCodeToSend) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "H & A Construction LLC <noreply@h-a-construction.com>",
            to: [recipientEmail],
            subject: `Verification Code: ${otpCodeToSend} — H & A Construction Signature Vault`,
            html: attachSocialFooterToHtml(`
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #0b2a4a; margin-top: 0;">H &amp; A Construction LLC</h2>
                <p style="font-size: 14px; color: #475569;">You requested access to your saved electronic signature vault for document verification.</p>
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0b2a4a;">${otpCodeToSend}</span>
                </div>
                <p style="font-size: 12px; color: #64748b;">This verification code expires in <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
              </div>
            `)
          })
        });
        if (!emailRes.ok) {
          const errTxt = await emailRes.text();
          console.warn("[Send OTP Email Warning] Resend dispatch warning:", errTxt);
        }
      } catch (eErr) {
        console.warn("[Send OTP Email Exception] Resend fetch exception:", eErr);
      }
    } else {
      console.info(`[Development Mode OTP Dispatch] Recipient: ${recipientEmail} | Code: ${otpCodeToSend}`);
    }

    // STRICT SECURITY RULE 1: Never return the OTP code to the browser/client!
    return NextResponse.json(
      { 
        success: true, 
        message: `Verification code sent to ${recipientEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2")}.` 
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );

  } catch (error: any) {
    console.error("[Send OTP API Exception]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error processing OTP request." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST with JSON body containing organizationId, estimateId, and clientEmail." },
    { status: 405, headers: NO_CACHE_HEADERS }
  );
}
