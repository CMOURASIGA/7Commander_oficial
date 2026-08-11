import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        // The callback page exchanges the OAuth code explicitly. Letting the
        // client detect it here would consume the PKCE verifier a second time.
        detectSessionInUrl: false,
      },
    });
  }

  return browserClient;
}
