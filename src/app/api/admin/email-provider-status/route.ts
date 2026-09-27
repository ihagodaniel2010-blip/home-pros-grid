import { NextResponse } from "next/server";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function GET() {
  const isConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const fromEmail = process.env.RESEND_FROM_EMAIL || "H&A Construction <no-reply@h-a-construction.com>";

  return NextResponse.json({
    configured: isConfigured,
    provider: "Resend",
    fromEmail
  }, { headers: NO_CACHE_HEADERS });
}
