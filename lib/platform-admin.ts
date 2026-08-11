import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
  if (!token || !NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false as const, response: NextResponse.json({ error: "Nao autenticado." }, { status: 401 }) };
  }
  const auth = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const result = await auth.auth.getUser(token);
  if (!result.data.user || result.error) {
    return { ok: false as const, response: NextResponse.json({ error: "Sessao invalida." }, { status: 401 }) };
  }
  const db = getSupabaseServerClient();
  if (!db) return { ok: false as const, response: NextResponse.json({ error: "Banco indisponivel." }, { status: 503 }) };
  const admin = await db.from("platform_admins").select("role").eq("user_id", result.data.user.id).eq("active", true).maybeSingle();
  if (!admin.data) return { ok: false as const, response: NextResponse.json({ error: "Acesso exclusivo da Consult Services." }, { status: 403 }) };
  return { ok: true as const, user: result.data.user, role: admin.data.role as string, db };
}

