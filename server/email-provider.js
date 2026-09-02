import { COMMUNICATION_TEMPLATES } from "../src/lib/communicationTemplates.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailRecipient(email) {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

export function renderTemplateText(templateText, variables = {}) {
  let result = String(templateText || "");
  Object.entries(variables).forEach(([key, val]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(pattern, String(val ?? ""));
  });
  return result;
}

export async function sendTransactionalEmail({ templateId, toEmail, variables = {}, customSubject, customReplyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "H&A Construction <no-reply@h-a-construction.com>";
  const replyToEmail = customReplyTo || process.env.RESEND_REPLY_TO_EMAIL;

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      configured: false,
      message: "RESEND_API_KEY is not configured in environment variables. Real email dispatch disabled."
    };
  }

  if (!validateEmailRecipient(toEmail)) {
    return {
      success: false,
      configured: true,
      message: "Invalid recipient email address format."
    };
  }

  const template = (COMMUNICATION_TEMPLATES || []).find((t) => t.id === templateId);
  if (!template) {
    return {
      success: false,
      configured: true,
      message: `Template ID '${templateId}' is not allowed or unrecognized.`
    };
  }

  const renderedSubject = customSubject || renderTemplateText(template.subject, variables);
  const renderedBodyText = renderTemplateText(template.bodyText, variables);
  const renderedBodyHtml = renderTemplateText(template.bodyHtml, variables);

  try {
    const resendBody = {
      from: fromEmail,
      to: [toEmail.trim()],
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
  } catch (err) {
    console.error("Server Error in sendTransactionalEmail:", err);
    return {
      success: false,
      configured: true,
      message: err.message || "Network error communicating with Resend provider."
    };
  }
}
