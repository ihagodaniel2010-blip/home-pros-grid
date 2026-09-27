import { NextResponse } from "next/server";

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
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const { toPhone, message } = body;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber || !accountSid.trim() || !authToken.trim() || !fromNumber.trim()) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: "Twilio provider is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Vercel Environment Variables."
      }, { headers: NO_CACHE_HEADERS });
    }

    if (!toPhone || String(toPhone).trim().length < 7) {
      return NextResponse.json({
        success: false,
        configured: true,
        message: "Invalid recipient phone number format."
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({
        success: false,
        configured: true,
        message: "Message payload parameter is required."
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const params = new URLSearchParams();
    params.append("To", String(toPhone).trim());
    params.append("From", String(fromNumber).trim());
    params.append("Body", String(message).trim());

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid.trim()}/Messages.json`;
    const authHeader = "Basic " + Buffer.from(`${accountSid.trim()}:${authToken.trim()}`).toString("base64");

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio API Dispatch Error:", data);
      return NextResponse.json({
        success: false,
        configured: true,
        message: data.message || data.more_info || "Failed to dispatch SMS via Twilio API."
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      sid: data.sid,
      message: "SMS sent successfully."
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("SMS API Route Error:", err);
    return NextResponse.json({
      success: false,
      configured: true,
      message: err.message || "Internal server error dispatching SMS."
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
