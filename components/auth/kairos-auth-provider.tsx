"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getClientAuthHeaders, clearClientAuthToken, setClientAuthToken } from "@/lib/client-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type KairosAuthState = {
  loading: boolean;
  required: boolean;
  user: User | null;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const KairosAuthContext = createContext<KairosAuthState | null>(null);

type ProviderProps = {
  required: boolean;
  children: React.ReactNode;
};

async function syncProfile(user: User) {
  try {
    await fetch("/api/auth/profile", {
      method: "POST",
      headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        nome: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
        avatarUrl: user.user_metadata?.avatar_url ?? "",
        provider: "google",
      }),
    });
  } catch {
    // best effort
  }
}

export function KairosAuthProvider({ required, children }: ProviderProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;
    void client.auth.getSession().then(async (result) => {
      if (!mounted) return;
      const sessionUser = result?.data?.session?.user ?? null;
      const token = result?.data?.session?.access_token ?? "";
      setUser(sessionUser);
      if (sessionUser && token) {
        setClientAuthToken(token, sessionUser.email ?? null);
        await syncProfile(sessionUser);
        syncedUserIdRef.current = sessionUser.id;
      } else {
        clearClientAuthToken();
        syncedUserIdRef.current = null;
      }
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      clearClientAuthToken();
      syncedUserIdRef.current = null;
      setUser(null);
      setLoading(false);
    });

    const subscription = client.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      const token = session?.access_token ?? "";
      setUser(currentUser);
      if (currentUser && token) {
        setClientAuthToken(token, currentUser.email ?? null);
        if (syncedUserIdRef.current !== currentUser.id) {
          await syncProfile(currentUser);
          syncedUserIdRef.current = currentUser.id;
        }
      } else {
        clearClientAuthToken();
        syncedUserIdRef.current = null;
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo<KairosAuthState>(() => {
    return {
      loading,
      required,
      user,
      signInWithGoogle: async (nextPath?: string) => {
        const client = getSupabaseBrowserClient();
        if (!client) throw new Error("Cliente Supabase indisponivel no navegador.");

        // The OAuth round-trip must stay on the same host that started it.
        // This keeps Vercel Preview deployments independent from production.
        const redirectUrl = new URL("/auth/callback", window.location.origin);
        if (nextPath?.trim()) {
          redirectUrl.searchParams.set("next", nextPath.trim());
        }
        const result = await client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl.toString() },
        });
        if (result.error) {
          throw new Error(result.error.message || "Falha ao iniciar login Google.");
        }
      },
      signOut: async () => {
        const client = getSupabaseBrowserClient();
        if (!client) return;
        await client.auth.signOut();
        clearClientAuthToken();
        setUser(null);
      },
    };
  }, [loading, required, user]);

  return <KairosAuthContext.Provider value={value}>{children}</KairosAuthContext.Provider>;
}

export function useKairosAuth(): KairosAuthState {
  const context = useContext(KairosAuthContext);
  if (!context) {
    throw new Error("useKairosAuth deve ser usado dentro de KairosAuthProvider.");
  }
  return context;
}
