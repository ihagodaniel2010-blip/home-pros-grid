import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizePhoneE164 } from "@/lib/server/twilio";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * Server-Side Feature Flag: Enable SMS sending for verbal consent methods
 * Default is FALSE until the new A2P 10DLC campaign is approved and active.
 */
function isVerbalConsentSMSEnabled(): boolean {
  return process.env.ENABLE_VERBAL_SMS_CONSENT === "true" || process.env.TWILIO_A2P_VERBAL_CONSENT_ENABLED === "true";
}

/**
 * GET /api/admin/sms-consent-status?estimateId=...&leadId=...&phone=...
 * Returns sanitized consent status and SMS dispatch eligibility for the UI.
 */
export async function GET(request: Request) {
  // 1. Authenticate and authorize admin user
  const auth = await verifyAdminAuth(request);
  if (!auth.isAllowed) {
    return NextResponse.json(
      { success: false, message: auth.error || "Unauthorized access." },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  const url = new URL(request.url);
  const estimateId = url.searchParams.get("estimateId");
  const leadId = url.searchParams.get("leadId");
  const rawPhone = url.searchParams.get("phone");

  if (!estimateId && !leadId && !rawPhone) {
    return NextResponse.json(
      { success: false, message: "Either estimateId, leadId, or phone must be provided." },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, message: "Database unconfigured." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }

  let targetLeadId = leadId;
  let targetPhone = rawPhone;

  // Resolve target lead ID and phone from estimate if estimateId is supplied
  if (estimateId) {
    const { data: est } = await db
      .from("estimates")
      .select("lead_id, client_phone")
      .eq("id", estimateId)
      .maybeSingle();

    if (est) {
      if (est.lead_id && !targetLeadId) targetLeadId = est.lead_id;
      if (est.client_phone && !targetPhone) targetPhone = est.client_phone;
    }
  }

  const normalizedPhone = normalizePhoneE164(targetPhone);

  // 1️⃣ Fetch latest consent event from public.sms_consents table
  let latestConsent: any = null;

  if (estimateId || targetLeadId || normalizedPhone) {
    let query = db.from("sms_consents").select("*").order("event_at", { ascending: false }).limit(1);

    if (estimateId) {
      query = query.eq("estimate_id", estimateId);
    } else if (targetLeadId) {
      query = query.eq("lead_id", targetLeadId);
    } else if (normalizedPhone) {
      query = query.eq("phone_e164", normalizedPhone);
    }

    const { data: events } = await query;
    if (events && events.length > 0) {
      latestConsent = events[0];
    } else if (normalizedPhone) {
      // Secondary fallback query by phone number across all consent records
      const { data: phoneEvents } = await db
        .from("sms_consents")
        .select("*")
        .eq("phone_e164", normalizedPhone)
        .order("event_at", { ascending: false })
        .limit(1);

      if (phoneEvents && phoneEvents.length > 0) {
        latestConsent = phoneEvents[0];
      }
    }
  }

  // 2️⃣ Fallback to web consent stored in leads.client_answers if no explicit sms_consents event
  let webConsent: any = null;
  if (!latestConsent && targetLeadId) {
    const { data: lead } = await db
      .from("leads")
      .select("phone, client_answers")
      .eq("id", targetLeadId)
      .maybeSingle();

    if (lead?.client_answers?.smsConsent === true) {
      const leadNormPhone = normalizePhoneE164(lead.phone);
      webConsent = {
        status: "confirmed",
        method: "web",
        phone_e164: leadNormPhone,
        event_at: lead.client_answers?.smsConsentTimestamp || null,
        notes: "Web opt-in via quote form"
      };
    } else if (lead?.client_answers?.smsConsent === false) {
      webConsent = {
        status: "declined",
        method: "web",
        notes: "Web opt-in explicitly declined"
      };
    }
  }

  const activeConsent = latestConsent || webConsent;

  // 3️⃣ Resolve final consent status and campaign restriction checks
  if (!activeConsent) {
    return NextResponse.json(
      {
        success: true,
        consent: {
          status: "not_collected",
          label: "SMS Consent: Not Collected",
          canSend: false,
          campaignAllowed: false,
          reason: "No SMS consent has been recorded for this phone number."
        }
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  // Validate phone matching if phone number on estimate differs from consent phone
  if (normalizedPhone && activeConsent.phone_e164 && normalizedPhone !== activeConsent.phone_e164) {
    return NextResponse.json(
      {
        success: true,
        consent: {
          status: "phone_mismatch",
          label: "SMS Consent: Phone Changed (Re-consent Required)",
          canSend: false,
          campaignAllowed: false,
          reason: `Phone number on estimate (${targetPhone}) does not match original consent phone number.`
        }
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  if (activeConsent.status === "declined" || activeConsent.status === "revoked") {
    return NextResponse.json(
      {
        success: true,
        consent: {
          status: activeConsent.status,
          label: `SMS Consent: ${activeConsent.status.toUpperCase()} by Customer`,
          canSend: false,
          campaignAllowed: false,
          reason: "Customer explicitly declined or revoked SMS opt-in authorization."
        }
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  const isVerbalMethod = ["verbal_phone", "verbal_in_person"].includes(activeConsent.method);
  const verbalEnabled = isVerbalConsentSMSEnabled();

  // If verbal consent, check feature flag (campaign activation rule)
  if (isVerbalMethod && !verbalEnabled) {
    return NextResponse.json(
      {
        success: true,
        consent: {
          status: "confirmed",
          method: activeConsent.method,
          phone: activeConsent.phone_e164,
          consented_at: activeConsent.event_at,
          label: "SMS Consent: Confirmed (Verbal — Pending Campaign Approval)",
          canSend: false,
          campaignAllowed: false,
          verbalPendingCampaign: true,
          reason: "Verbal consent recorded successfully. SMS dispatch is temporarily held until the new A2P 10DLC campaign is approved and active."
        }
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      success: true,
      consent: {
        status: "confirmed",
        method: activeConsent.method,
        phone: activeConsent.phone_e164,
        consented_at: activeConsent.event_at,
        label: "SMS Consent: Confirmed",
        canSend: true,
        campaignAllowed: true,
        reason: "Valid SMS consent recorded and permitted by active campaign configuration."
      }
    },
    { headers: NO_CACHE_HEADERS }
  );
}
