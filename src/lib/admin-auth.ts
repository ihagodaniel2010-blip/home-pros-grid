import { supabase } from "@/lib/supabase";
import { isAdminAllowed } from "@/lib/admin-allowlist";

export type AdminSession = {
  email: string;
};

export type AdminLoginResult = {
  ok: boolean;
  error?: string;
};

export const adminLogin = async (): Promise<AdminLoginResult> => {
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/admin`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account'
      }
    }
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

export const fetchAdminSession = async (): Promise<AdminSession | null> => {
  if (!supabase) return null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const email = session.user.email || "";
    if (!isAdminAllowed(email)) {
      return null;
    }

    return {
      email,
    };
  } catch (e) {
    console.error("fetchAdminSession error:", e);
    return null;
  }
};

export const adminLogout = async (): Promise<void> => {
  if (!supabase) return;
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("ha_construction_user_session");
  }
};

export type LoginAttempt = {
  timestamp: string;
  email: string;
  ip: string;
  outcome: "success" | "fail";
  reason?: string;
};

export const fetchLoginAttempts = async (status?: string): Promise<LoginAttempt[]> => {
  return [];
};
