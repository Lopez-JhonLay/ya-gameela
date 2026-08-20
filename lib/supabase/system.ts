import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env/server";

import type { Database } from "./database.types";

export function createSystemSupabaseClient() {
  return createClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
