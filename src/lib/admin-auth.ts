import { supabase } from "@/lib/supabase";

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
      redirectTo: `${window.location.origin}/admin`
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

    return {
      email: session.user.email || "Unknown",
    };
  } catch (e) {
    console.error("fetchAdminSession error:", e);
    return null;
  }
};

export const adminLogout = async (): Promise<void> => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export type LoginAttempt = {
  timestamp: string;
  email: string;
  ip: string;
  outcome: "success" | "fail";
  reason?: string;
};

export const fetchLoginAttempts = async (status?: string): Promise<LoginAttempt[]> => {
  // Login attempts tracking should be moved to a Supabase table if needed
  // For now returning empty to satisfy the UI
  return [];
};
