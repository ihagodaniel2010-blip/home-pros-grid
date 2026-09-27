import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isServiceRoleConfigured = Boolean(supabaseUrl && serviceRoleKey && serviceRoleKey.trim());

export const supabaseAdmin = isServiceRoleConfigured
  ? createClient(supabaseUrl!, serviceRoleKey!.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

