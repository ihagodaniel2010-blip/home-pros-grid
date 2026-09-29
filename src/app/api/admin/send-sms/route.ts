import { NextResponse } from "next/server";
import { sendCustomerServiceSMS, isTwilioSMSEnabled } from "@/lib/server/twilio";

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
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { toPhone, message, consentRecord, bypassConsentCheck } = body;

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

    // Dispatch via centralized Twilio module (Consent Gate & Feature Flag enforced)
    const result = await sendCustomerServiceSMS({
      toPhone: String(toPhone),
      messageText: String(message),
      consentRecord: consentRecord || null
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
