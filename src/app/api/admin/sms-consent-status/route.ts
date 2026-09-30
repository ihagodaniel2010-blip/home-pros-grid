import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizePhoneE164 } from "@/lib/server/twilio";

// No‑Cache headers for security
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * GET /api/admin/sms-consent-status?estimateId=...&leadId=...
 * Returns a sanitized consent status for the UI.
 *
 * Security:
 *   - Uses the service‑role client (supabaseAdmin) which never leaves the server.
 *   - No user‑provided data is echoed back; only a minimal consent summary.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const estimateId = url.searchParams.get("estimateId");
  const leadId = url.searchParams.get("leadId");

  if (!estimateId && !leadId) {
    return NextResponse.json(
      { success: false, message: "Either estimateId or leadId must be provided" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json(
      { success: false, message: "Database not configured" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }

  // Resolve target lead id if only estimateId was supplied
  let targetLeadId = leadId;
  if (!targetLeadId && estimateId) {
    const { data: est } = await db
      .from("estimates")
      .select("lead_id")
      .eq("id", estimateId)
      .maybeSingle();
    if (est?.lead_id) targetLeadId = est.lead_id;
  }

  // 1️⃣ Fetch latest consent events for this lead (if any)
  let latestConsent = null;
  if (targetLeadId) {
    const { data: events } = await db
      .from("sms_consents")
      .select("status, method, phone_e164, consented_at")
      .eq("lead_id", targetLeadId)
      .order("consented_at", { ascending: false })
      .limit(1);
    if (events && events.length) latestConsent = events[0];
  }

  // 2️⃣ Fallback to web consent stored in leads.client_answers
  let webConsent = null;
  if (targetLeadId) {
    const { data: lead } = await db
      .from("leads")
      .select("phone, client_answers")
      .eq("id", targetLeadId)
      .maybeSingle();
    if (lead?.client_answers?.smsConsent === true) {
      const normalizedPhone = normalizePhoneE164(lead.phone);
      webConsent = {
        status: "confirmed",
        method: "web",
        phone: normalizedPhone,
        consented_at: lead.client_answers?.smsConsentTimestamp || null,
        consent_text_version: lead.client_answers?.smsConsentTextVersion || null,
      };
    } else if (lead?.client_answers?.smsConsent === false) {
      webConsent = { status: "declined", method: "web" };
    }
  }

  // 3️⃣ Resolve final status – most recent event for the SAME phone number
  let result = { status: "not_collected" } as any;
  if (latestConsent) {
    result = {
      status: latestConsent.status,
      method: latestConsent.method,
      phone: latestConsent.phone_e164,
      consented_at: latestConsent.consented_at,
    };
  } else if (webConsent) {
    result = webConsent;
  }

  return NextResponse.json({ success: true, consent: result }, { headers: NO_CACHE_HEADERS });
}
