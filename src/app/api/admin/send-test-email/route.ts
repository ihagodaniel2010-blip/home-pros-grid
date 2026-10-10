import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/server/admin-auth";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function renderTemplateText(templateText: string, variables: Record<string, any> = {}) {
  let result = String(templateText || "");
  Object.entries(variables).forEach(([key, val]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(pattern, String(val ?? ""));
  });
  return result;
}

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
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const { templateId, toEmail, variables = {}, subject, bodyText, bodyHtml } = body;
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "H&A Construction <no-reply@h-a-construction.com>";

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: "RESEND_API_KEY is not configured in environment variables. Real email dispatch disabled."
      }, { headers: NO_CACHE_HEADERS });
    }

    if (!toEmail || !EMAIL_REGEX.test(String(toEmail).trim())) {
      return NextResponse.json({
        success: false,
        configured: true,
        message: "Invalid recipient email address format."
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const clientName = variables.customer_name || "Valued Client";
    const projectType = variables.project_type || "Construction Project";
    const totalAmount = variables.total_amount || "";
    const estimateLink = variables.estimate_link || "https://www.h-a-construction.com/";

    const finalSubject = subject || `Your Estimate from H & A Construction LLC — ${projectType}`;

    const defaultHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
            .header { background: #0b2a4a; padding: 28px 32px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { color: #f59e0b; margin: 4px 0 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .content { padding: 32px; }
            .greeting { font-size: 18px; font-weight: 700; color: #0b2a4a; margin-bottom: 16px; }
            .message { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 28px; }
            .card-title { font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
            .card-value { font-size: 20px; font-weight: 800; color: #0b2a4a; }
            .btn-container { text-align: center; margin: 32px 0; }
            .btn { background-color: #ea580c; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-weight: 800; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); }
            .link-text { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; text-align: center; }
            .footer { background: #f1f5f9; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .footer p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>H &amp; A CONSTRUCTION LLC</h1>
              <p>Quality Construction &amp; Carpentry Services</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${clientName},</div>
              <div class="message">
                Your official estimate for <strong>${projectType}</strong> is ready for review. Please click the button below to view the detailed proposal, breakdown of services, and approve electronic terms.
              </div>
              ${totalAmount ? `
              <div class="card">
                <div class="card-title">Estimated Investment</div>
                <div class="card-value">${totalAmount}</div>
              </div>` : ''}
              <div class="btn-container">
                <a href="${estimateLink}" class="btn" target="_blank">View Your Estimate</a>
              </div>
              <div class="link-text">
                Or copy and paste this link into your browser:<br>
                <a href="${estimateLink}" style="color: #2563eb;">${estimateLink}</a>
              </div>
            </div>
            <div class="footer">
              <p><strong>H &amp; A Construction LLC</strong></p>
              <p>Phone: (207) 509-0204 | Email: info@h-a-construction.com</p>
              <p>Website: www.h-a-construction.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const finalHtml = bodyHtml ? renderTemplateText(bodyHtml, variables) : defaultHtml;
    const finalBodyText = bodyText ? renderTemplateText(bodyText, variables) : `H&A Construction LLC: Your estimate for ${projectType} is ready to review. Open link: ${estimateLink}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [String(toEmail).trim()],
        subject: finalSubject,
        text: finalBodyText,
        html: finalHtml
      })
    });

    const data = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API Error:", data);
      return NextResponse.json({
        success: false,
        configured: true,
        message: data.message || data.error?.message || "Failed to send email via Resend API."
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      messageId: data.id,
      message: "Estimate email dispatched successfully."
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("Email API Route Error:", err);
    return NextResponse.json({
      success: false,
      configured: true,
      message: err.message || "Internal server error dispatching email."
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
