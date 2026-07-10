import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Service-role client — bypasses RLS and column privileges. ONLY use in server
// actions AFTER an explicit role check (e.g. requireSuperAdmin). Never expose to
// the browser. Used to read/write super_admin-only columns (bonus/tier) that are
// REVOKEd from the anon/authenticated Postgres roles.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
