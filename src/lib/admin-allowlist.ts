// Admin email allowlist - ONLY these email addresses can access administrative routes & endpoints
export const ALLOWED_ADMIN_EMAILS = [
  "hugoluizfds11@gmail.com",
  "adelmoferreira6328@gmail.com"
].map(email => email.toLowerCase());

export const isAdminAllowed = (email?: string | null): boolean => {
  if (!email || typeof email !== "string") return false;
  return ALLOWED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};
