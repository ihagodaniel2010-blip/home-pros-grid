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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  return {
    email: session.user.email || "Unknown"
  };
};

export const adminLogout = async (): Promise<void> => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const fetchLoginAttempts = async (): Promise<any[]> => {
  // Login attempts tracking should be moved to a Supabase table if needed
  return [];
};
