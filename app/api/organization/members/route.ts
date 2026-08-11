import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_ROLES = new Set(["owner", "admin"]);
const INVITABLE_ROLES = new Set(["admin", "manager", "member"]);

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponivel." }, { status: 503 });

  const members = await supabase
    .from("organization_members")
    .select("id, user_id, role, status, created_at")
    .eq("organization_id", auth.context.organizationId)
    .order("created_at", { ascending: true });
  const invites = ADMIN_ROLES.has(auth.context.organizationRole)
    ? await supabase
        .from("organization_invites")
        .select("id, email, role, status, expires_at, created_at")
        .eq("organization_id", auth.context.organizationId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: [] as unknown[], error: null };

  const profiles = members.data?.length
    ? await supabase.from("profiles").select("user_id, email, nome").in("user_id", members.data.map((item) => item.user_id))
    : { data: [] as Array<{ user_id: string; email: string | null; nome: string | null }>, error: null };
  if (members.error || invites.error || profiles.error) {
    console.error("[/api/organization/members] GET", members.error ?? invites.error);
    return NextResponse.json({ error: "Falha ao carregar usuarios da empresa." }, { status: 500 });
  }
  return NextResponse.json({
    data: {
      organization: {
        id: auth.context.organizationId,
        name: auth.context.organizationName,
        role: auth.context.organizationRole,
      },
        members: (members.data ?? []).map((member) => ({
          ...member,
          profiles: profiles.data?.find((profile) => profile.user_id === member.user_id) ?? null,
        })),
      invites: invites.data ?? [],
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  if (!ADMIN_ROLES.has(auth.context.organizationRole)) {
    return NextResponse.json({ error: "Somente owner ou admin pode convidar usuarios." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "member";
  if (!/^\S+@\S+\.\S+$/.test(email) || !INVITABLE_ROLES.has(role)) {
    return NextResponse.json({ error: "E-mail ou perfil invalido." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponivel." }, { status: 503 });
  const result = await supabase
    .from("organization_invites")
    .upsert({
      organization_id: auth.context.organizationId,
      email,
      role,
      status: "pending",
      invited_by: auth.context.userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "organization_id,email" })
    .select("id, email, role, status, expires_at")
    .single();
  if (result.error) {
    console.error("[/api/organization/members] POST", result.error);
    return NextResponse.json({ error: "Falha ao registrar convite." }, { status: 500 });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
