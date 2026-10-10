import { describe, it, expect } from "vitest";
import { isAdminAllowed, ALLOWED_ADMIN_EMAILS } from "../lib/admin-allowlist";
import { normalizePhoneE164, checkSMSConsent } from "../lib/server/twilio";

describe("1. Admin Authorization Security & Allowlist Tests", () => {
  it("should contain exactly the 2 designated admin emails", () => {
    expect(ALLOWED_ADMIN_EMAILS).toHaveLength(2);
    expect(ALLOWED_ADMIN_EMAILS).toContain("hugoluizfds11@gmail.com");
    expect(ALLOWED_ADMIN_EMAILS).toContain("adelmoferreira6328@gmail.com");
  });

  it("should authorize hugoluizfds11@gmail.com regardless of case", () => {
    expect(isAdminAllowed("hugoluizfds11@gmail.com")).toBe(true);
    expect(isAdminAllowed("HUGOLUIZFDS11@GMAIL.COM")).toBe(true);
    expect(isAdminAllowed(" Hugoluizfds11@gmail.com ")).toBe(true);
  });

  it("should authorize adelmoferreira6328@gmail.com regardless of case", () => {
    expect(isAdminAllowed("adelmoferreira6328@gmail.com")).toBe(true);
    expect(isAdminAllowed("ADELMOFERREIRA6328@GMAIL.COM")).toBe(true);
    expect(isAdminAllowed(" adelmoferreira6328@gmail.com ")).toBe(true);
  });

  it("should reject any other unauthorized Google accounts", () => {
    expect(isAdminAllowed("unauthorized@gmail.com")).toBe(false);
    expect(isAdminAllowed("hacker@gmail.com")).toBe(false);
    expect(isAdminAllowed("user@h-a-construction.com")).toBe(false);
    expect(isAdminAllowed("otheradmin@gmail.com")).toBe(false);
    expect(isAdminAllowed("")).toBe(false);
    expect(isAdminAllowed(null)).toBe(false);
    expect(isAdminAllowed(undefined)).toBe(false);
  });
});

describe("2. Phone Normalization (E.164) Tests", () => {
  it("should correctly normalize 10-digit US numbers to E.164", () => {
    expect(normalizePhoneE164("2075090204")).toBe("+12075090204");
    expect(normalizePhoneE164("(207) 509-0204")).toBe("+12075090204");
    expect(normalizePhoneE164("207.509.0204")).toBe("+12075090204");
  });

  it("should correctly normalize 11-digit US numbers with 1", () => {
    expect(normalizePhoneE164("12075090204")).toBe("+12075090204");
    expect(normalizePhoneE164("+1 (207) 509-0204")).toBe("+12075090204");
  });

  it("should reject invalid or incomplete phone numbers", () => {
    expect(normalizePhoneE164("12345")).toBe(null);
    expect(normalizePhoneE164("")).toBe(null);
    expect(normalizePhoneE164(null)).toBe(null);
  });
});

describe("3. SMS Consent Gate & Mandatory Block Tests", () => {
  it("should block SMS dispatch if no consent record is provided", () => {
    const result = checkSMSConsent(null);
    expect(result.canSend).toBe(false);
    expect(result.reason).toContain("No lead or consent record provided");
  });

  it("should block SMS dispatch if consent is explicitly false", () => {
    const result = checkSMSConsent({ smsConsent: false });
    expect(result.canSend).toBe(false);
    expect(result.reason).toContain("Blocked by Consent Gate");
  });

  it("should allow SMS dispatch if consent is explicitly true", () => {
    const result = checkSMSConsent({ smsConsent: true });
    expect(result.canSend).toBe(true);
  });
});
