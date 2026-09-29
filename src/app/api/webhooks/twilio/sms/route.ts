import { NextRequest, NextResponse } from "next/server";
import { logSMSEvent } from "@/lib/server/twilio";

/**
 * ARCHITECTURE FOR FUTURE INCOMING SMS WEBHOOK (TWILIO INBOUND)
 * 
 * Status: INACTIVE PREPARATION
 * Webhook URL to point in Twilio Console when ready:
 * https://www.h-a-construction.com/api/webhooks/twilio/sms
 * 
 * This handler prepares parsing for incoming SMS messages (e.g. STOP, HELP, customer replies),
 * logs the inbound event safely, and responds with empty TwiML or acknowledgment.
 */

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let bodyData: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        bodyData[key] = value.toString();
      });
    } else if (contentType.includes("application/json")) {
      bodyData = await req.json();
    }

    const from = bodyData.From || bodyData.from || "unknown";
    const body = bodyData.Body || bodyData.body || "";
    const messageSid = bodyData.MessageSid || bodyData.smsSid || "N/A";
    const timestamp = new Date().toISOString();

    // Safe server logging of inbound message
    logSMSEvent({
      recipient: from,
      messageType: "inbound_sms",
      twilioSid: messageSid,
      timestamp,
      status: "received",
      sourceRecordId: `inbound_${messageSid}`
    });

    console.log(`[TWILIO INBOUND SMS] From: ${from} | Body snippet: "${body.slice(0, 30)}..." | SID: ${messageSid}`);

    // Standard TwiML response format for Twilio Inbound Webhooks
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml"
      }
    });

  } catch (err: any) {
    console.error("[TWILIO INBOUND SMS ERROR]", err?.message || err);
    return NextResponse.json({ error: "Failed to process inbound SMS payload" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    webhook: "Twilio Inbound SMS Webhook Architecture (Inactive until configured in Twilio Console)",
    timestamp: new Date().toISOString()
  });
}
