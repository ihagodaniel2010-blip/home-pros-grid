import { supabase } from "@/lib/supabase";

/**
 * Utility function to perform fetch requests to /api/admin/* endpoints
 * with the authenticated user's Supabase Bearer token attached.
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
    } catch (e) {
      console.warn("Failed to retrieve Supabase session for authenticatedFetch:", e);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
