/**
 * SERVER-SIDE ONLY TWILIO SMS MODULE — H & A CONSTRUCTION LLC
 * 
 * Compliance & Architecture Rules:
 * - Server-side only: Never exposed to or executed on the client browser.
 * - Consent Gate: Validates explicit smsConsent === true before sending.
 * - Feature Flag: TWILIO_SMS_ENABLED (default: false).
 * - Identification: Identifies "H & A Construction LLC" on all templates.
 * - Opt-out Disclosure: Includes "Reply STOP to opt out or HELP for help." on all templates.
 * - E.164 Normalization: Formats all recipient numbers to +1XXXXXXXXXX.
 * - Multi-Auth Support: Supports TWILIO_API_KEY + TWILIO_API_SECRET or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.
 * - Messaging Service: Uses TWILIO_MESSAGING_SERVICE_SID.
 * - Safe Logging: Never logs secrets, tokens, or private credentials.
 */

import { NextResponse } from "next/server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/server/twilio.ts is a server-side module and cannot be imported in client code.");
}

export interface TwilioSendResult {
  success: boolean;
  sid?: string;
  status: string;
  disabled?: boolean;
  blockedByConsent?: boolean;
  error?: string;
}

export interface SMSConsentRecord {
  smsConsent?: boolean;
  client_answers?: {
    smsConsent?: boolean;
    [key: string]: any;
  };
  phone?: string;
  [key: string]: any;
}

/**
 * Normalizes phone numbers to E.164 format (+1XXXXXXXXXX for US numbers).
 */
export function normalizePhoneE164(phoneInput?: string | null): string | null {
  if (!phoneInput || typeof phoneInput !== "string") return null;

  const trimmed = phoneInput.trim();
  if (!trimmed) return null;

  // Keep digits and leading plus
  let cleaned = trimmed.replace(/[^\d+]/g, "");

  // If already starts with +
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return null;
  }

  // 10 digits US number (e.g., 2078198622) -> +12078198622
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // 11 digits US number starting with 1 (e.g., 12078198622) -> +12078198622
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }

  return null;
}

/**
 * Validates explicit SMS consent before any text message is sent.
 * Returns true only if smsConsent === true or client_answers.smsConsent === true.
 */
export function checkSMSConsent(record?: SMSConsentRecord | null): { canSend: boolean; reason?: string } {
  if (!record) {
    return { canSend: false, reason: "No lead or consent record provided." };
  }

  const hasDirectConsent = record.smsConsent === true;
  const hasClientAnswersConsent = record.client_answers?.smsConsent === true;

  if (hasDirectConsent || hasClientAnswersConsent) {
    return { canSend: true };
  }

  return {
    canSend: false,
    reason: "Blocked by Consent Gate: User has not provided explicit SMS opt-in consent (smsConsent is false or missing)."
  };
}

/**
 * Server-Side Feature Flag check: TWILIO_SMS_ENABLED === 'true'
 */
export function isTwilioSMSEnabled(): boolean {
  return process.env.TWILIO_SMS_ENABLED === "true";
}

/**
 * Safe Server Event Logger
 */
export function logSMSEvent(event: {
  recipient: string;
  messageType: string;
  twilioSid?: string;
  timestamp: string;
  status: string;
  sourceRecordId?: string;
  error?: string;
}) {
  const maskedPhone = event.recipient.length > 6
    ? `${event.recipient.slice(0, 3)}****${event.recipient.slice(-4)}`
    : event.recipient;

  console.log(`[TWILIO SMS LOG] ${event.timestamp} | Type: ${event.messageType} | To: ${maskedPhone} | Status: ${event.status} | SID: ${event.twilioSid || 'N/A'}${event.sourceRecordId ? ` | Source: ${event.sourceRecordId}` : ''}${event.error ? ` | Error: ${event.error}` : ''}`);
}

/**
 * Core Twilio SMS Dispatch Function (Server-Only REST Client)
 */
export async function sendTwilioSMS(options: {
  toPhone: string;
  messageBody: string;
  messageType: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
  bypassConsentCheck?: boolean; // Only for emergency/manual admin tests with explicit admin action
}): Promise<TwilioSendResult> {
  const now = new Date().toISOString();
  const normalizedTo = normalizePhoneE164(options.toPhone);

  if (!normalizedTo) {
    logSMSEvent({
      recipient: options.toPhone || "unknown",
      messageType: options.messageType,
      timestamp: now,
      status: "failed",
      sourceRecordId: options.sourceRecordId,
      error: "Invalid E.164 phone number format."
    });
    return {
      success: false,
      status: "failed",
      error: "Invalid phone number format. Must be a valid 10-digit US mobile number."
    };
  }

  // 1. Consent Gate Validation
  if (!options.bypassConsentCheck) {
    const consentCheck = checkSMSConsent(options.consentRecord);
    if (!consentCheck.canSend) {
      logSMSEvent({
        recipient: normalizedTo,
        messageType: options.messageType,
        timestamp: now,
        status: "blocked_no_consent",
        sourceRecordId: options.sourceRecordId,
        error: consentCheck.reason
      });
      return {
        success: false,
        status: "blocked_no_consent",
        blockedByConsent: true,
        error: consentCheck.reason
      };
    }
  }

  // 2. Feature Flag Check (TWILIO_SMS_ENABLED)
  if (!isTwilioSMSEnabled()) {
    logSMSEvent({
      recipient: normalizedTo,
      messageType: options.messageType,
      timestamp: now,
      status: "disabled_feature_flag",
      sourceRecordId: options.sourceRecordId,
      error: "TWILIO_SMS_ENABLED=false (Twilio Campaign in review)."
    });
    return {
      success: false,
      status: "disabled",
      disabled: true,
      error: "Twilio SMS feature is currently disabled (TWILIO_SMS_ENABLED=false). Real messages will be dispatched when A2P Campaign is approved."
    };
  }

  // 3. Environment Credentials Check
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const fromPhone = process.env.TWILIO_PHONE_NUMBER?.trim() || "+12078198622";

  if (!accountSid || !apiKey || !apiSecret) {
    logSMSEvent({
      recipient: normalizedTo,
      messageType: options.messageType,
      timestamp: now,
      status: "unconfigured",
      sourceRecordId: options.sourceRecordId,
      error: "Twilio env credentials missing."
    });
    return {
      success: false,
      status: "unconfigured",
      error: "Twilio server credentials are not fully configured in environment variables."
    };
  }

  try {
    const params = new URLSearchParams();
    params.append("To", normalizedTo);
    params.append("Body", options.messageBody.trim());

    if (messagingServiceSid) {
      params.append("MessagingServiceSid", messagingServiceSid);
    } else {
      params.append("From", fromPhone);
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const resData = await response.json();

    if (!response.ok) {
      const errMsg = resData.message || resData.more_info || `Twilio HTTP ${response.status}`;
      logSMSEvent({
        recipient: normalizedTo,
        messageType: options.messageType,
        twilioSid: resData.sid,
        timestamp: now,
        status: "api_error",
        sourceRecordId: options.sourceRecordId,
        error: errMsg
      });
      return {
        success: false,
        sid: resData.sid,
        status: "failed",
        error: errMsg
      };
    }

    logSMSEvent({
      recipient: normalizedTo,
      messageType: options.messageType,
      twilioSid: resData.sid,
      timestamp: now,
      status: resData.status || "queued",
      sourceRecordId: options.sourceRecordId
    });

    return {
      success: true,
      sid: resData.sid,
      status: resData.status || "queued"
    };

  } catch (err: any) {
    const errorText = err.message || "Unknown network error connecting to Twilio.";
    logSMSEvent({
      recipient: normalizedTo,
      messageType: options.messageType,
      timestamp: now,
      status: "network_error",
      sourceRecordId: options.sourceRecordId,
      error: errorText
    });
    return {
      success: false,
      status: "failed",
      error: errorText
    };
  }
}

// ─────────────────────────────────────────────────────────────
// CENTRALIZED COMPLIANT SMS TEMPLATE DISPATCHERS
// Always identifies "H & A Construction LLC"
// Always includes "Reply STOP to opt out or HELP for help."
// ─────────────────────────────────────────────────────────────

const OPT_OUT_DISCLOSURE = "Reply STOP to opt out or HELP for help.";
const BUSINESS_NAME = "H & A Construction LLC";

/**
 * 1. Estimate Ready Notification SMS
 */
export async function sendEstimateReadySMS(options: {
  toPhone: string;
  estimateId: string;
  projectType: string;
  estimateLink: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
}): Promise<TwilioSendResult> {
  const body = `${BUSINESS_NAME}: Your estimate #${options.estimateId.slice(0, 8)} for ${options.projectType} is ready. View details: ${options.estimateLink} - ${OPT_OUT_DISCLOSURE}`;
  return sendTwilioSMS({
    toPhone: options.toPhone,
    messageBody: body,
    messageType: "estimate_ready",
    consentRecord: options.consentRecord,
    sourceRecordId: options.sourceRecordId || options.estimateId
  });
}

/**
 * 2. Project Scheduling SMS
 */
export async function sendSchedulingSMS(options: {
  toPhone: string;
  date: string;
  time: string;
  address?: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
}): Promise<TwilioSendResult> {
  const body = `${BUSINESS_NAME}: Your project site visit is scheduled for ${options.date} at ${options.time}${options.address ? ` at ${options.address}` : ''}. Questions? Call (207) 819-8622. ${OPT_OUT_DISCLOSURE}`;
  return sendTwilioSMS({
    toPhone: options.toPhone,
    messageBody: body,
    messageType: "project_scheduling",
    consentRecord: options.consentRecord,
    sourceRecordId: options.sourceRecordId
  });
}

/**
 * 3. Project Status Update SMS
 */
export async function sendProjectUpdateSMS(options: {
  toPhone: string;
  projectName: string;
  updateMessage: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
}): Promise<TwilioSendResult> {
  const body = `${BUSINESS_NAME}: Update for "${options.projectName}": ${options.updateMessage} ${OPT_OUT_DISCLOSURE}`;
  return sendTwilioSMS({
    toPhone: options.toPhone,
    messageBody: body,
    messageType: "project_update",
    consentRecord: options.consentRecord,
    sourceRecordId: options.sourceRecordId
  });
}

/**
 * 4. Change Order Notification SMS
 */
export async function sendChangeOrderSMS(options: {
  toPhone: string;
  changeOrderTitle: string;
  amount: number;
  changeOrderLink: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
}): Promise<TwilioSendResult> {
  const body = `${BUSINESS_NAME}: Change order "${options.changeOrderTitle}" ($${options.amount}) has been issued. Review & approve: ${options.changeOrderLink} - ${OPT_OUT_DISCLOSURE}`;
  return sendTwilioSMS({
    toPhone: options.toPhone,
    messageBody: body,
    messageType: "change_order",
    consentRecord: options.consentRecord,
    sourceRecordId: options.sourceRecordId
  });
}

/**
 * 5. Payment Reminder SMS
 */
export async function sendPaymentReminderSMS(options: {
  toPhone: string;
  estimateId: string;
  balanceDue: number;
  paymentLink: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
}): Promise<TwilioSendResult> {
  const body = `${BUSINESS_NAME}: Payment reminder for estimate #${options.estimateId.slice(0, 8)}. Balance due: $${options.balanceDue.toLocaleString()}. Pay securely: ${options.paymentLink} - ${OPT_OUT_DISCLOSURE}`;
  return sendTwilioSMS({
    toPhone: options.toPhone,
    messageBody: body,
    messageType: "payment_reminder",
    consentRecord: options.consentRecord,
    sourceRecordId: options.sourceRecordId || options.estimateId
  });
}

/**
 * 6. Generic Customer Service Notification SMS
 */
export async function sendCustomerServiceSMS(options: {
  toPhone: string;
  messageText: string;
  consentRecord?: SMSConsentRecord | null;
  sourceRecordId?: string;
}): Promise<TwilioSendResult> {
  const body = `${BUSINESS_NAME}: ${options.messageText.trim()} ${OPT_OUT_DISCLOSURE}`;
  return sendTwilioSMS({
    toPhone: options.toPhone,
    messageBody: body,
    messageType: "customer_service",
    consentRecord: options.consentRecord,
    sourceRecordId: options.sourceRecordId
  });
}
