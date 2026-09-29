import { NextResponse } from "next/server";
import { sendCustomerServiceSMS, normalizePhoneE164, SMSConsentRecord } from "@/lib/server/twilio";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { createClient } from "@supabase/supabase-js";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

function getDbClient() {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { toPhone, message, estimateId, leadId, consentRecord: providedConsent, bypassConsentCheck } = body;

    if (!toPhone) {
      return NextResponse.json(
        { success: false, message: "Recipient phone number is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, message: "Message content parameter is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    let verifiedConsentRecord: SMSConsentRecord | null = providedConsent || null;
    const db = getDbClient();

    // If consentRecord is not passed directly, look up lead via estimateId or leadId
    if (!verifiedConsentRecord && db) {
      let targetLeadId: string | null = leadId || null;

      if (!targetLeadId && estimateId) {
        const { data: est } = await db
          .from("estimates")
          .select("lead_id, client_phone")
          .eq("id", estimateId)
          .maybeSingle();

        if (est && est.lead_id) {
          targetLeadId = est.lead_id;
        }
      }

      if (!targetLeadId) {
        return NextResponse.json(
          {
            success: false,
            blockedByConsent: true,
            message: "SMS dispatch notice: No lead or consent record provided. (Manual estimate without linked lead)"
          },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      // Fetch lead details from database using only existing schema columns
      const { data: lead } = await db
        .from("leads")
        .select("id, fullName, phone, client_answers")
        .eq("id", targetLeadId)
        .maybeSingle();

      if (!lead) {
        return NextResponse.json(
          {
            success: false,
            blockedByConsent: true,
            message: "SMS dispatch notice: Linked lead record not found in database."
          },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      // 1. Phone matching validation (Compare normalized E.164)
      const normLeadPhone = normalizePhoneE164(lead.phone);
      const normToPhone = normalizePhoneE164(toPhone);

      if (!normLeadPhone || !normToPhone || normLeadPhone !== normToPhone) {
        return NextResponse.json(
          {
            success: false,
            blockedByConsent: true,
            message: `SMS dispatch notice: Phone number on estimate (${toPhone}) does not match the phone number given during SMS consent (${lead.phone || 'N/A'}). Re-consent required.`
          },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      // 2. Validate SMS consent from client_answers JSONB
      const ca = lead.client_answers || {};
      const hasConsent = ca.smsConsent === true;

      if (!hasConsent) {
        return NextResponse.json(
          {
            success: false,
            blockedByConsent: true,
            message: "SMS dispatch notice: Customer explicitly selected NO or did not provide SMS opt-in consent."
          },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      verifiedConsentRecord = {
        smsConsent: true,
        smsConsentTimestamp: ca.smsConsentTimestamp,
        smsConsentTextVersion: ca.smsConsentTextVersion,
        smsConsentPageUrl: ca.smsConsentPageUrl,
        phone: lead.phone,
        leadId: lead.id,
        client_answers: ca
      };
    }

    // Dispatch via centralized Twilio module (Consent Gate & Feature Flag enforced)
    const result = await sendCustomerServiceSMS({
      toPhone: String(toPhone),
      messageText: String(message),
      consentRecord: verifiedConsentRecord
    });

    if (result.disabled) {
      return NextResponse.json({
        success: false,
        disabled: true,
        message: "TWILIO_SMS_ENABLED is set to false (A2P 10DLC Campaign pending approval). No real SMS sent."
      }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    if (result.blockedByConsent) {
      return NextResponse.json({
        success: false,
        blockedByConsent: true,
        message: result.error || "SMS blocked by Consent Gate (User did not opt in)."
      }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || "Twilio SMS dispatch failed."
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      success: true,
      sid: result.sid,
      status: result.status,
      message: "SMS dispatched successfully."
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[ADMIN SEND-SMS API ERROR]", err);
    return NextResponse.json({
      success: false,
      message: err.message || "Internal server error dispatching SMS."
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

