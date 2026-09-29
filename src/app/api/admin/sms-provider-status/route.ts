import { NextResponse } from "next/server";
import { isTwilioSMSEnabled } from "@/lib/server/twilio";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY || process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || "+12078198622";
  
  const isConfigured = Boolean(accountSid?.trim() && apiKey?.trim());
  const isEnabled = isTwilioSMSEnabled();

  return NextResponse.json({
    provider: "Twilio",
    configured: isConfigured,
    enabled: isEnabled, // TWILIO_SMS_ENABLED=false
    messagingServiceConfigured: Boolean(messagingServiceSid?.trim()),
    fromNumber: fromNumber,
    a2pStatus: "Campaign In Review (SMS Sending Disabled until approval)",
    compliance: {
      consentGateActive: true,
      optOutIncluded: true,
      senderIdentified: true
    }
  }, { headers: NO_CACHE_HEADERS });
}
