import { COMMUNICATION_TEMPLATES, CommunicationTemplate } from "@/lib/communicationTemplates";

export interface SendEmailPayload {
  templateId: string;
  toEmail: string;
  variables?: Record<string, string>;
  customSubject?: string;
  customReplyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  configured: boolean;
  messageId?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const BRAND_EMAIL_FOOTER_HTML = `
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 36px; padding-top: 24px; border-top: 2px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;" id="brand-social-footer">
  <tr>
    <td align="center" style="padding-bottom: 12px;">
      <span style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase;">CONNECT WITH H&amp;A CONSTRUCTION</span>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-bottom: 20px;">
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
        <tr>
          <!-- Instagram -->
          <td style="padding: 0 6px;">
            <a href="https://www.instagram.com/h.a_construction/" target="_blank" style="text-decoration: none;">
              <table border="0" cellpadding="0" cellspacing="0" width="36" height="36" style="border-radius: 50%; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); width: 36px; height: 36px;">
                <tr>
                  <td align="center" valign="middle">
                    <img src="https://img.icons8.com/ios-glyphs/30/ffffff/instagram-new.png" width="18" height="18" alt="Instagram" style="display: block; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- Facebook -->
          <td style="padding: 0 6px;">
            <a href="https://www.facebook.com/" target="_blank" style="text-decoration: none;">
              <table border="0" cellpadding="0" cellspacing="0" width="36" height="36" style="border-radius: 50%; background-color: #1877F2; width: 36px; height: 36px;">
                <tr>
                  <td align="center" valign="middle">
                    <img src="https://img.icons8.com/ios-glyphs/30/ffffff/facebook-new.png" width="18" height="18" alt="Facebook" style="display: block; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- YouTube -->
          <td style="padding: 0 6px;">
            <a href="https://www.youtube.com/" target="_blank" style="text-decoration: none;">
              <table border="0" cellpadding="0" cellspacing="0" width="36" height="36" style="border-radius: 50%; background-color: #FF0000; width: 36px; height: 36px;">
                <tr>
                  <td align="center" valign="middle">
                    <img src="https://img.icons8.com/ios-glyphs/30/ffffff/youtube-play.png" width="18" height="18" alt="YouTube" style="display: block; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <!-- Website -->
          <td style="padding: 0 6px;">
            <a href="https://h-a-construction.com" target="_blank" style="text-decoration: none;">
              <table border="0" cellpadding="0" cellspacing="0" width="36" height="36" style="border-radius: 50%; background-color: #0b2a4a; width: 36px; height: 36px;">
                <tr>
                  <td align="center" valign="middle">
                    <img src="https://img.icons8.com/ios-glyphs/30/ffffff/domain.png" width="18" height="18" alt="Website" style="display: block; border: 0; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" style="font-size: 12px; color: #64748b; line-height: 1.6;">
      <strong style="color: #0b2a4a;">H &amp; A Construction LLC</strong> &bull; Southern Maine Contractor<br />
      Saco, Biddeford, Scarborough, Portland &amp; Surrounding Areas<br />
      <a href="https://h-a-construction.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">www.h-a-construction.com</a>
    </td>
  </tr>
</table>
`;

export function attachSocialFooterToHtml(htmlBody: string): string {
  if (!htmlBody) return BRAND_EMAIL_FOOTER_HTML;
  if (htmlBody.includes('id="brand-social-footer"') || htmlBody.includes('CONNECT WITH H&amp;A CONSTRUCTION')) {
    return htmlBody;
  }
  if (htmlBody.includes('</div>')) {
    const lastDiv = htmlBody.lastIndexOf('</div>');
    return htmlBody.slice(0, lastDiv) + BRAND_EMAIL_FOOTER_HTML + htmlBody.slice(lastDiv);
  }
  return htmlBody + BRAND_EMAIL_FOOTER_HTML;
}

export function validateEmailRecipient(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

export function getTemplateById(templateId: string): CommunicationTemplate | undefined {
  return COMMUNICATION_TEMPLATES.find(t => t.id === templateId);
}

export function renderTemplateText(templateText: string, variables: Record<string, string> = {}): string {
  let result = templateText;
  Object.entries(variables).forEach(([key, val]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(pattern, String(val ?? ''));
  });
  return result;
}

export async function sendTransactionalEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "H&A Construction <no-reply@h-a-construction.com>";
  const replyToEmail = payload.customReplyTo || process.env.RESEND_REPLY_TO_EMAIL;

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      configured: false,
      message: "RESEND_API_KEY is not configured in environment variables. Real email dispatch disabled."
    };
  }

  // 1. Validate Recipient Email
  if (!validateEmailRecipient(payload.toEmail)) {
    return {
      success: false,
      configured: true,
      message: "Invalid recipient email address format."
    };
  }

  // 2. Validate Allowed Template
  const template = getTemplateById(payload.templateId);
  if (!template) {
    return {
      success: false,
      configured: true,
      message: `Template ID '${payload.templateId}' is not allowed or unrecognized.`
    };
  }

  // 3. Render Subject and Content
  const renderedSubject = payload.customSubject || renderTemplateText(template.subject, payload.variables);
  const renderedBodyText = renderTemplateText(template.bodyText, payload.variables);
  const rawBodyHtml = renderTemplateText(template.bodyHtml, payload.variables);
  const renderedBodyHtml = attachSocialFooterToHtml(rawBodyHtml);

  try {
    const resendBody: Record<string, any> = {
      from: fromEmail,
      to: [payload.toEmail.trim()],
      subject: renderedSubject,
      text: renderedBodyText,
      html: renderedBodyHtml
    };

    if (replyToEmail) {
      resendBody.reply_to = replyToEmail.trim();
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", data);
      return {
        success: false,
        configured: true,
        message: data.message || data.error?.message || "Failed to send email via Resend API."
      };
    }

    return {
      success: true,
      configured: true,
      messageId: data.id,
      message: "Email sent successfully via Resend."
    };
  } catch (err: any) {
    console.error("Server Error in sendTransactionalEmail:", err);
    return {
      success: false,
      configured: true,
      message: err.message || "Network error communicating with Resend provider."
    };
  }
}
