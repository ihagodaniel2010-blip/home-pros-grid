// Admin email allowlist - only these emails can access /admin routes
export const ADMIN_EMAIL_ALLOWLIST = [
  "admin1@example.com",
  "admin2@example.com",
  "admin3@example.com",
];

export const isAdminAllowed = (email: string): boolean => {
  return ADMIN_EMAIL_ALLOWLIST.includes(email.toLowerCase());
};
