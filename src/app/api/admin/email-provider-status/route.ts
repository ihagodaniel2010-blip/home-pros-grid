import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAllowed) {
    return NextResponse.json(
      { success: false, message: auth.error || "Unauthorized access." },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  const isConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const fromEmail = process.env.RESEND_FROM_EMAIL || "H&A Construction <no-reply@h-a-construction.com>";

  return NextResponse.json({
    configured: isConfigured,
    provider: "Resend",
    fromEmail
  }, { headers: NO_CACHE_HEADERS });
}
