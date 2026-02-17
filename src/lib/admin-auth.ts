const ADMIN_EMAIL = "admin@networx.com";
const ADMIN_PASSWORD = "admin123";
const AUTH_KEY = "networx_admin_auth";

export const adminLogin = (email: string, password: string): boolean => {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
};

export const isAdminLoggedIn = (): boolean => localStorage.getItem(AUTH_KEY) === "true";

export const adminLogout = () => localStorage.removeItem(AUTH_KEY);

export const ADMIN_DISPLAY_EMAIL = ADMIN_EMAIL;
