import { createClient } from "@supabase/supabase-js";
import { isConfiguredSecret } from "@/lib/env";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isConfiguredSecret(url) || !isConfiguredSecret(serviceRoleKey)) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
