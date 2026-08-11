import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getPublicEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const body = await request.json();
  const organizationId = String(body.organizationId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.temporaryPassword ?? "");
  if (!organizationId || !email || password.length < 8) return NextResponse.json({ error: "Cliente, e-mail e senha temporaria com 8 caracteres sao obrigatorios." }, { status: 400 });
  const organization = await access.db.from("organizations").select("id,licensed_users,organization_members(count)").eq("id", organizationId).single();
  if (!organization.data) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
  const signup = createClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const created = await signup.auth.signUp({ email, password, options: { emailRedirectTo: `${request.nextUrl.origin}/auth/callback?activated=1`, data: { full_name: body.name || email, must_change_password: true, organization_id: organizationId } } });
  if (created.error || !created.data.user) return NextResponse.json({ error: created.error?.message || "Nao foi possivel criar o usuario." }, { status: 400 });
  const member = await access.db.from("organization_members").upsert({ organization_id: organizationId, user_id: created.data.user.id, role: body.role || "member", status: "active" }, { onConflict: "organization_id,user_id" });
  if (member.error) return NextResponse.json({ error: member.error.message }, { status: 400 });
  await access.db.from("profiles").upsert({ user_id: created.data.user.id, nome: body.name || email, email, active_organization_id: organizationId }, { onConflict: "user_id" });
  await access.db.from("platform_audit_log").insert({ actor_user_id: access.user.id, organization_id: organizationId, action: "user.provisioned", entity_type: "user", entity_id: created.data.user.id, details: { email, role: body.role || "member" } });
  return NextResponse.json({ userId: created.data.user.id, confirmationSent: true }, { status: 201 });
}

