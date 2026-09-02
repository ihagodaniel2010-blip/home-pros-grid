export interface CommunicationTemplate {
  id: string;
  name: string;
  category: "customer" | "company" | "internal";
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string;
  variables: string[];
}

export const COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  {
    id: "quote_request_received_customer",
    name: "Quote Request Confirmation (Customer)",
    category: "customer",
    subject: "We received your quote request — H&A Construction",
    preview: "Thank you for contacting H&A Construction. We have received your project details.",
    variables: ["customerName", "serviceName", "zipCode", "companyPhone"],
    bodyText: `Hi {{customerName}},

Thank you for reaching out to H&A Construction! We have received your request for {{serviceName}} in ZIP {{zipCode}}.

Our team is currently reviewing your project details and will be in touch shortly to schedule an estimate or discuss the next steps.

Need immediate assistance? Call us at {{companyPhone}}.

Best regards,
H&A Construction Team
https://h-a-construction.com`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0b2a4a;">H&A Construction</h2>
  <p>Hi <strong>{{customerName}}</strong>,</p>
  <p>Thank you for reaching out to H&A Construction! We have received your request for <strong>{{serviceName}}</strong> in ZIP <strong>{{zipCode}}</strong>.</p>
  <p>Our team is currently reviewing your project details and will be in touch shortly to schedule an estimate or discuss next steps.</p>
  <p>Need immediate assistance? Call us at <strong>{{companyPhone}}</strong>.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888;">H&A Construction &bull; <a href="https://h-a-construction.com">h-a-construction.com</a></p>
</div>`
  },
  {
    id: "new_lead_available_company",
    name: "New Lead Available Notification (Company)",
    category: "company",
    subject: "New Lead Available in {{cityName}}, {{stateCode}} — H&A Construction",
    preview: "A new matching service lead is available in your service area.",
    variables: ["serviceName", "cityName", "stateCode", "zipCode", "urgency", "marketUrl"],
    bodyText: `Hello Team,

A new {{urgency}} lead for {{serviceName}} has just arrived in {{cityName}}, {{stateCode}} ({{zipCode}}).

Log in to your H&A Construction portal to view lead details or acquire it:
{{marketUrl}}

Best regards,
H&A Construction Operations System`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0b2a4a;">New Lead Alert</h2>
  <p>A new <strong>{{urgency}}</strong> lead for <strong>{{serviceName}}</strong> has arrived in <strong>{{cityName}}, {{stateCode}} ({{zipCode}})</strong>.</p>
  <p><a href="{{marketUrl}}" style="background: #0b2a4a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View in Lead Market</a></p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888;">H&A Construction System</p>
</div>`
  },
  {
    id: "lead_purchased_company",
    name: "Lead Purchase Confirmation (Company)",
    category: "company",
    subject: "Lead Purchased: {{customerName}} ({{serviceName}})",
    preview: "You have acquired a new lead. Customer details are now accessible.",
    variables: ["customerName", "customerPhone", "customerEmail", "serviceName", "priceCharged", "leadUrl"],
    bodyText: `Lead Acquisition Confirmation

You have successfully purchased the lead for {{customerName}} ({{serviceName}}) for \${{priceCharged}}.

Customer Contact Details:
- Name: {{customerName}}
- Phone: {{customerPhone}}
- Email: {{customerEmail}}

Manage lead & prepare estimate:
{{leadUrl}}

H&A Construction Lead Management`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0b2a4a;">Lead Acquired</h2>
  <p>You purchased the lead for <strong>{{customerName}}</strong> ({{serviceName}}) for <strong>\${{priceCharged}}</strong>.</p>
  <ul>
    <li><strong>Name:</strong> {{customerName}}</li>
    <li><strong>Phone:</strong> {{customerPhone}}</li>
    <li><strong>Email:</strong> {{customerEmail}}</li>
  </ul>
  <p><a href="{{leadUrl}}" style="background: #0b2a4a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Lead Details</a></p>
</div>`
  },
  {
    id: "estimate_sent_customer",
    name: "Estimate Sent to Customer",
    category: "customer",
    subject: "Your Estimate from H&A Construction (#{{estimateNumber}})",
    preview: "Your official project estimate is ready for review.",
    variables: ["customerName", "estimateNumber", "totalAmount", "publicEstimateUrl"],
    bodyText: `Hi {{customerName}},

Your estimate (#{{estimateNumber}}) for your project with H&A Construction is ready.

Total Estimated Amount: \${{totalAmount}}

View, review, and approve your estimate online:
{{publicEstimateUrl}}

If you have any questions, please contact our office.

Sincerely,
H&A Construction
https://h-a-construction.com`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0b2a4a;">Official Project Estimate</h2>
  <p>Hi <strong>{{customerName}}</strong>,</p>
  <p>Your estimate (<strong>#{{estimateNumber}}</strong>) is ready for review.</p>
  <p style="font-size: 18px; font-weight: bold; color: #0b2a4a;">Total: \${{totalAmount}}</p>
  <p><a href="{{publicEstimateUrl}}" style="background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Review & Approve Estimate</a></p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
  <p style="font-size: 12px; color: #888;">H&A Construction &bull; <a href="https://h-a-construction.com">h-a-construction.com</a></p>
</div>`
  },
  {
    id: "estimate_approved_company",
    name: "Estimate Approved Notification (Company)",
    category: "company",
    subject: "Estimate Approved! Customer {{customerName}} (#{{estimateNumber}})",
    preview: "Great news! The customer has approved estimate #{{estimateNumber}}.",
    variables: ["customerName", "estimateNumber", "totalAmount", "approvedAt", "estimateUrl"],
    bodyText: `Great News!

Customer {{customerName}} has approved Estimate #{{estimateNumber}} on {{approvedAt}}.

Total Approved Amount: \${{totalAmount}}

View job status and schedule work:
{{estimateUrl}}

H&A Construction Admin`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #16a34a;">Estimate Approved!</h2>
  <p>Customer <strong>{{customerName}}</strong> approved Estimate <strong>#{{estimateNumber}}</strong> on {{approvedAt}}.</p>
  <p style="font-size: 18px; font-weight: bold; color: #16a34a;">Approved Total: \${{totalAmount}}</p>
  <p><a href="{{estimateUrl}}" style="background: #16a34a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Job Record</a></p>
</div>`
  },
  {
    id: "estimate_rejected_company",
    name: "Estimate Rejected Notification (Company)",
    category: "company",
    subject: "Estimate Update: #{{estimateNumber}} (Declined)",
    preview: "Customer {{customerName}} has declined estimate #{{estimateNumber}}.",
    variables: ["customerName", "estimateNumber", "rejectionReason", "estimateUrl"],
    bodyText: `Estimate Status Update

Customer {{customerName}} has declined Estimate #{{estimateNumber}}.

Feedback / Reason:
{{rejectionReason}}

View estimate record:
{{estimateUrl}}

H&A Construction Admin`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #dc2626;">Estimate Declined</h2>
  <p>Customer <strong>{{customerName}}</strong> declined Estimate <strong>#{{estimateNumber}}</strong>.</p>
  <p><strong>Reason / Notes:</strong> {{rejectionReason}}</p>
  <p><a href="{{estimateUrl}}" style="background: #64748b; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View Estimate</a></p>
</div>`
  },
  {
    id: "service_extra_sent_customer",
    name: "Service Change Order / Extra Sent",
    category: "customer",
    subject: "Project Change Order #{{extraNumber}} from H&A Construction",
    preview: "A project change order / extra item requires your authorization.",
    variables: ["customerName", "extraNumber", "extraTitle", "extraAmount", "publicExtraUrl"],
    bodyText: `Hi {{customerName}},

A new project change order / extra item (#{{extraNumber}}) has been added to your job.

Item: {{extraTitle}}
Amount: \${{extraAmount}}

Please review and authorize this change order:
{{publicExtraUrl}}

Thank you,
H&A Construction`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0b2a4a;">Project Change Order / Extra</h2>
  <p>Hi <strong>{{customerName}}</strong>,</p>
  <p>A change order (<strong>#{{extraNumber}}</strong>) was requested for your project: <strong>{{extraTitle}}</strong>.</p>
  <p style="font-size: 16px; font-weight: bold;">Amount: \${{extraAmount}}</p>
  <p><a href="{{publicExtraUrl}}" style="background: #2563eb; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Review & Authorize</a></p>
</div>`
  },
  {
    id: "service_extra_approved_company",
    name: "Service Change Order Approved (Company)",
    category: "company",
    subject: "Change Order Approved: #{{extraNumber}} - {{customerName}}",
    preview: "The customer has approved change order #{{extraNumber}}.",
    variables: ["customerName", "extraNumber", "extraTitle", "extraAmount", "extraUrl"],
    bodyText: `Change Order Approved

Customer {{customerName}} approved change order #{{extraNumber}} ({{extraTitle}}) for \${{extraAmount}}.

Job Details:
{{extraUrl}}

H&A Construction System`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #16a34a;">Change Order Approved</h2>
  <p>Customer <strong>{{customerName}}</strong> authorized change order <strong>#{{extraNumber}}</strong> (\${{extraAmount}}).</p>
</div>`
  },
  {
    id: "payment_received_customer_receipt",
    name: "Payment Receipt Sent to Customer",
    category: "customer",
    subject: "Payment Receipt #{{receiptNumber}} — H&A Construction",
    preview: "Thank you for your payment. Your receipt is ready.",
    variables: ["customerName", "receiptNumber", "amountPaid", "paymentMethod", "publicReceiptUrl"],
    bodyText: `Hi {{customerName}},

Thank you for your payment of \${{amountPaid}} via {{paymentMethod}}.

Your receipt (#{{receiptNumber}}) is available online:
{{publicReceiptUrl}}

We appreciate your business!

H&A Construction
https://h-a-construction.com`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2 style="color: #0b2a4a;">Payment Receipt</h2>
  <p>Hi <strong>{{customerName}}</strong>,</p>
  <p>Thank you for your payment of <strong>\${{amountPaid}}</strong> (Method: {{paymentMethod}}).</p>
  <p>Receipt Number: <strong>#{{receiptNumber}}</strong></p>
  <p><a href="{{publicReceiptUrl}}" style="background: #16a34a; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">View Official Receipt</a></p>
</div>`
  },
  {
    id: "client_receipt_viewed_company",
    name: "Receipt Viewed Alert (Company)",
    category: "company",
    subject: "Receipt #{{receiptNumber}} Viewed by {{customerName}}",
    preview: "Customer opened receipt #{{receiptNumber}}.",
    variables: ["customerName", "receiptNumber", "viewedAt"],
    bodyText: `Notification: Customer {{customerName}} opened payment receipt #{{receiptNumber}} on {{viewedAt}}.`,
    bodyHtml: `<p>Customer <strong>{{customerName}}</strong> viewed receipt <strong>#{{receiptNumber}}</strong> on {{viewedAt}}.</p>`
  },
  {
    id: "expense_missing_receipt_company",
    name: "Expense Missing Receipt Alert (Internal)",
    category: "internal",
    subject: "Action Required: Missing Receipt for Expense #{{expenseId}}",
    preview: "An expense entry is missing a receipt upload.",
    variables: ["expenseId", "vendorName", "amount", "recordedBy"],
    bodyText: `Attention: Expense #{{expenseId}} (\${{amount}} at {{vendorName}}) recorded by {{recordedBy}} requires a receipt image for tax compliance. Please upload a receipt.`,
    bodyHtml: `<p>Expense <strong>#{{expenseId}}</strong> (\${{amount}} - {{vendorName}}) requires a receipt file upload.</p>`
  },
  {
    id: "reimbursement_pending_company",
    name: "Reimbursement Pending Approval (Internal)",
    category: "internal",
    subject: "Reimbursement Request Pending: {{requesterName}} (\${{amount}})",
    preview: "A partner/employee reimbursement is pending admin review.",
    variables: ["requesterName", "amount", "description", "adminUrl"],
    bodyText: `Reimbursement Request

{{requesterName}} submitted a reimbursement request of \${{amount}} for: {{description}}.

Review request:
{{adminUrl}}`,
    bodyHtml: `<p><strong>{{requesterName}}</strong> submitted a reimbursement of <strong>\${{amount}}</strong>: {{description}}.</p>`
  },
  {
    id: "low_credit_balance_company",
    name: "Low Lead Credit Balance Alert (Internal)",
    category: "company",
    subject: "Low Lead Credit Balance Warning — \${{currentBalance}}",
    preview: "Your lead credit balance is running low.",
    variables: ["currentBalance", "maxLeadPrice", "billingUrl"],
    bodyText: `Low Credit Balance Warning

Your current lead credit balance is \${{currentBalance}}, which may be lower than your maximum lead price (\${{maxLeadPrice}}).

Add credits to continue receiving automatic leads:
{{billingUrl}}

H&A Construction System`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; color: #333;">
  <h3 style="color: #dc2626;">Low Lead Balance Warning</h3>
  <p>Current balance is <strong>\${{currentBalance}}</strong>. Please top up to avoid missing leads.</p>
  <p><a href="{{billingUrl}}" style="background: #dc2626; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Billing & Credits</a></p>
</div>`
  },
  {
    id: "job_status_update_customer",
    name: "Job Status Update (Customer)",
    category: "customer",
    subject: "Project Update: {{jobStatus}} — H&A Construction",
    preview: "An update has been posted to your home construction project.",
    variables: ["customerName", "jobStatus", "updateMessage", "portalUrl"],
    bodyText: `Hi {{customerName}},

Status Update for your project: {{jobStatus}}

Notes:
{{updateMessage}}

Track your project:
{{portalUrl}}

Best regards,
H&A Construction`,
    bodyHtml: `<div style="font-family: Arial, sans-serif; color: #333;">
  <h3 style="color: #0b2a4a;">Project Status Update</h3>
  <p>Hi <strong>{{customerName}}</strong>,</p>
  <p>Status: <strong>{{jobStatus}}</strong></p>
  <p>{{updateMessage}}</p>
</div>`
  }
];
