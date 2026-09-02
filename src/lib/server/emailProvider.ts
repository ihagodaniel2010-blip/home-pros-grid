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
  const renderedBodyHtml = renderTemplateText(template.bodyHtml, payload.variables);

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
