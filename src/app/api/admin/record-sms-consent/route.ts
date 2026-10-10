import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { normalizePhoneE164 } from "@/lib/server/twilio";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";

/**
 * POST /api/admin/record-sms-consent
 * Server-only endpoint to record staff-validated verbal SMS consent (Verbal Phone or Verbal In Person).
 */
export async function POST(request: Request) {
  // 1. Authenticate and authorize admin user
  const auth = await verifyAdminAuth(request);
  if (!auth.isAllowed) {
    return NextResponse.json(
      { success: false, message: auth.error || "Unauthorized access." },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { estimateId, leadId, method, confirmed, notes } = body;

    if (!confirmed) {
      return NextResponse.json(
        { success: false, message: "Consent confirmation check is required to record verbal authorization." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!method || !["verbal_phone", "verbal_in_person"].includes(method)) {
      return NextResponse.json(
        { success: false, message: "Invalid consent method. Must be 'verbal_phone' or 'verbal_in_person'." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (!estimateId && !leadId) {
      return NextResponse.json(
        { success: false, message: "Either estimateId or leadId must be provided." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const db = supabaseAdmin;
    if (!db) {
      return NextResponse.json(
        { success: false, message: "Database client unconfigured." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    let targetPhone: string | null = null;
    let targetOrgId: string = DEFAULT_ORG_ID;
    let targetLeadId: string | null = leadId || null;
    let targetEstimateId: string | null = estimateId || null;

    // Fetch details directly from estimate in DB to prevent tampering
    if (targetEstimateId) {
      const { data: est, error: estErr } = await db
        .from("estimates")
        .select("id, organization_id, lead_id, client_phone")
        .eq("id", targetEstimateId)
        .maybeSingle();

      if (estErr || !est) {
        return NextResponse.json(
          { success: false, message: "Estimate record not found in database." },
          { status: 404, headers: NO_CACHE_HEADERS }
        );
      }

      if (est.client_phone) targetPhone = est.client_phone;
      if (est.organization_id) targetOrgId = est.organization_id;
      if (est.lead_id) targetLeadId = est.lead_id;
    }

    // Fallback: fetch from lead if phone not on estimate
    if (!targetPhone && targetLeadId) {
      const { data: lead } = await db
        .from("leads")
        .select("id, phone, organization_id")
        .eq("id", targetLeadId)
        .maybeSingle();

      if (lead) {
        if (lead.phone) targetPhone = lead.phone;
        if (lead.organization_id) targetOrgId = lead.organization_id;
      }
    }

    const normalizedPhone = normalizePhoneE164(targetPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: "Could not record consent: Phone number is missing or invalid E.164 format." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Insert record into public.sms_consents table
    const consentPayload = {
      organization_id: targetOrgId,
      lead_id: targetLeadId,
      estimate_id: targetEstimateId,
      phone_e164: normalizedPhone,
      status: "confirmed",
      method: method,
      event_at: new Date().toISOString(),
      recorded_by_user_id: auth.user.id,
      actor_type: "staff",
      consent_text_version: "verbal_v1",
      notes: notes ? String(notes).trim() : null
    };

    const { data: insertedRecord, error: insertErr } = await db
      .from("sms_consents")
      .insert(consentPayload)
      .select()
      .single();

    if (insertErr) {
      console.error("[RECORD SMS CONSENT DB ERROR]", insertErr);
      return NextResponse.json(
        { success: false, message: `Failed to record SMS consent in database: ${insertErr.message}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verbal SMS consent recorded successfully.",
        consent: {
          id: insertedRecord.id,
          status: insertedRecord.status,
          method: insertedRecord.method,
          phone: insertedRecord.phone_e164,
          consented_at: insertedRecord.event_at,
          recorded_by: auth.user.email
        }
      },
      { headers: NO_CACHE_HEADERS }
    );

  } catch (err: any) {
    console.error("[RECORD SMS CONSENT ROUTE ERROR]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
