import { NextResponse } from "next/server";
import { sendCustomerServiceSMS, normalizePhoneE164, SMSConsentRecord } from "@/lib/server/twilio";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

function isVerbalConsentSMSEnabled(): boolean {
  return process.env.ENABLE_VERBAL_SMS_CONSENT === "true" || process.env.TWILIO_A2P_VERBAL_CONSENT_ENABLED === "true";
}

export async function POST(request: Request) {
  // 1. Authenticate and authorize admin user (HTTP 401 / HTTP 403)
  const auth = await verifyAdminAuth(request);
  if (!auth.isAllowed) {
    return NextResponse.json(
      { success: false, message: auth.error || "Unauthorized access to SMS dispatch API." },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

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

    const { toPhone, message, estimateId, leadId } = body;

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

    const normToPhone = normalizePhoneE164(toPhone);
    if (!normToPhone) {
      return NextResponse.json(
        { success: false, message: "Recipient phone number is not a valid E.164 phone number." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const db = supabaseAdmin;
    if (!db) {
      return NextResponse.json(
        { success: false, message: "Database service_role client unavailable." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Perform fresh server-side consent lookup immediately before sending
    let activeConsent: any = null;

    // Search public.sms_consents first
    let query = db.from("sms_consents").select("*").order("event_at", { ascending: false }).limit(1);
    if (estimateId) {
      query = query.eq("estimate_id", estimateId);
    } else if (leadId) {
      query = query.eq("lead_id", leadId);
    } else {
      query = query.eq("phone_e164", normToPhone);
    }

    const { data: events } = await query;
    if (events && events.length > 0) {
      activeConsent = events[0];
    } else if (normToPhone) {
      const { data: phoneEvents } = await db
        .from("sms_consents")
        .select("*")
        .eq("phone_e164", normToPhone)
        .order("event_at", { ascending: false })
        .limit(1);
      if (phoneEvents && phoneEvents.length > 0) {
        activeConsent = phoneEvents[0];
      }
    }

    // Fallback: check web consent in leads.client_answers
    if (!activeConsent && (leadId || estimateId)) {
      let targetLeadId = leadId;
      if (!targetLeadId && estimateId) {
        const { data: est } = await db.from("estimates").select("lead_id").eq("id", estimateId).maybeSingle();
        if (est?.lead_id) targetLeadId = est.lead_id;
      }

      if (targetLeadId) {
        const { data: lead } = await db.from("leads").select("phone, client_answers").eq("id", targetLeadId).maybeSingle();
        if (lead?.client_answers?.smsConsent === true) {
          activeConsent = {
            status: "confirmed",
            method: "web",
            phone_e164: normalizePhoneE164(lead.phone)
          };
        } else if (lead?.client_answers?.smsConsent === false) {
          activeConsent = {
            status: "declined",
            method: "web"
          };
        }
      }
    }

    // 3. Mandatory Consent Blocks
    if (!activeConsent) {
      return NextResponse.json(
        {
          success: false,
          blockedByConsent: true,
          message: "SMS blocked: No SMS opt-in consent recorded for this phone number."
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    if (activeConsent.status !== "confirmed") {
      return NextResponse.json(
        {
          success: false,
          blockedByConsent: true,
          message: `SMS blocked: Customer consent status is '${activeConsent.status}'.`
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Phone matching check
    if (activeConsent.phone_e164 && normToPhone !== activeConsent.phone_e164) {
      return NextResponse.json(
        {
          success: false,
          blockedByConsent: true,
          message: `SMS blocked: Phone number on estimate (${toPhone}) does not match the consent phone number (${activeConsent.phone_e164}). Re-consent required.`
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Verbal Consent Campaign Feature Flag check
    const isVerbalMethod = ["verbal_phone", "verbal_in_person"].includes(activeConsent.method);
    if (isVerbalMethod && !isVerbalConsentSMSEnabled()) {
      return NextResponse.json(
        {
          success: false,
          blockedByConsent: true,
          message: "SMS blocked: Sending SMS via verbal consent is disabled until the new A2P 10DLC campaign is approved and activated."
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const consentRecordPayload: SMSConsentRecord = {
      smsConsent: true,
      phone: activeConsent.phone_e164 || normToPhone,
      method: activeConsent.method
    };

    // 4. Dispatch SMS via Twilio module
    const result = await sendCustomerServiceSMS({
      toPhone: normToPhone,
      messageText: String(message),
      consentRecord: consentRecordPayload
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
        message: result.error || "SMS blocked by Consent Gate."
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
