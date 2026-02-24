import { apiUrl } from "@/lib/api-url";

export type AdminSession = {
  email: string;
};

export type AdminLoginResult = {
  ok: boolean;
  status: number;
  error?: string;
};

export type LoginAttempt = {
  timestamp: string;
  email: string;
  ip: string;
  userAgent: string;
  outcome: "success" | "fail";
  reason: "wrong_email" | "wrong_password" | "rate_limited" | "success";
};

export const adminLogin = async (email: string, password: string): Promise<AdminLoginResult> => {
  try {
    const response = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      return { ok: true, status: response.status };
    }

    let error = "Acesso restrito";
    try {
      const payload = await response.json();
      if (payload?.error) error = payload.error;
    } catch {
      // Keep default message.
    }

    return { ok: false, status: response.status, error };
  } catch {
    return { ok: false, status: 0, error: "Backend offline" };
  }
};

export const fetchAdminSession = async (): Promise<AdminSession | null> => {
  const response = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
  if (!response.ok) return null;
  return response.json();
};

export const adminLogout = async (): Promise<void> => {
  await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
};

export const fetchLoginAttempts = async (status?: "success" | "fail"): Promise<LoginAttempt[]> => {
  const query = status ? `?status=${status}` : "";
  const response = await fetch(apiUrl(`/api/admin/login-attempts${query}`), {
    credentials: "include",
  });
  if (!response.ok) return [];
  return response.json();
};
