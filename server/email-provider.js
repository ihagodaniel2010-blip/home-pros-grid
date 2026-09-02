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

export async function sendTransactionalEmail({ templateId, toEmail, variables = {}, customSubject, customBodyText, customBodyHtml, customReplyTo }) {
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

  const subject = customSubject || `H&A Construction Notification (${templateId || 'General'})`;
  const bodyText = customBodyText ? renderTemplateText(customBodyText, variables) : `H&A Construction Notification: ${templateId}`;
  const bodyHtml = customBodyHtml ? renderTemplateText(customBodyHtml, variables) : `<p>H&A Construction Notification: <strong>${templateId}</strong></p>`;

  try {
    const resendBody = {
      from: fromEmail,
      to: [toEmail.trim()],
      subject,
      text: bodyText,
      html: bodyHtml
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
