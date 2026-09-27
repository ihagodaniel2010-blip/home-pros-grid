import { NextResponse } from "next/server";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const isConfigured = Boolean(accountSid && accountSid.trim() && authToken && authToken.trim() && fromNumber && fromNumber.trim());

  return NextResponse.json({
    configured: isConfigured,
    provider: "Twilio",
    fromNumber: fromNumber || null
  }, { headers: NO_CACHE_HEADERS });
}
