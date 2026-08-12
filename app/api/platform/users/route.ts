import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getPublicEnv } from "@/lib/env";

const ALLOWED_ROLES = new Set(["owner", "admin", "manager", "member"]);

export async function GET(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Empresa licenciada obrigatoria." }, { status: 400 });

  const memberships = await access.db.from("organization_members")
    .select("id,user_id,role,status,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (memberships.error) return NextResponse.json({ error: memberships.error.message }, { status: 500 });

  const userIds = (memberships.data ?? []).map((item) => item.user_id);
  const profiles = userIds.length
    ? await access.db.from("profiles").select("user_id,nome,email").in("user_id", userIds)
    : { data: [], error: null };
  if (profiles.error) return NextResponse.json({ error: profiles.error.message }, { status: 500 });
  const profileByUser = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile]));
  return NextResponse.json({ users: (memberships.data ?? []).map((membership) => ({
    ...membership,
    name: profileByUser.get(membership.user_id)?.nome ?? "",
    email: profileByUser.get(membership.user_id)?.email ?? "",
  })) });
}

async function findUserByEmail(db: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 10; page += 1) {
    const result = await db.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const user = result.data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (result.data.users.length < 100) return null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;

  const body = await request.json();
  const organizationId = String(body.organizationId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.temporaryPassword ?? "");
  const role = ALLOWED_ROLES.has(String(body.role)) ? String(body.role) : "member";

  if (!organizationId || !email) {
    return NextResponse.json({ error: "Empresa licenciada e e-mail sao obrigatorios." }, { status: 400 });
  }

  const organization = await access.db
    .from("organizations")
    .select("id,licensed_users,organization_members(count)")
    .eq("id", organizationId)
    .single();
  if (!organization.data) {
    return NextResponse.json({ error: "Empresa licenciada nao encontrada." }, { status: 404 });
  }

  const memberCount = Number(organization.data.organization_members?.[0]?.count ?? 0);
  if (memberCount >= Number(organization.data.licensed_users ?? 0)) {
    return NextResponse.json({ error: "Limite de usuarios da licenca atingido." }, { status: 409 });
  }

  let user: User | null;
  try {
    user = await findUserByEmail(access.db, email);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao consultar o usuario." }, { status: 500 });
  }
  let confirmationSent = false;

  if (!user) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Para um novo usuario, informe uma senha temporaria com pelo menos 8 caracteres." }, { status: 400 });
    }
    const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
    const signup = createClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const created = await signup.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback?activated=1`,
        data: { full_name: body.name || email, must_change_password: true, organization_id: organizationId },
      },
    });
    if (created.error || !created.data.user) {
      return NextResponse.json({ error: created.error?.message || "Nao foi possivel criar o usuario." }, { status: 400 });
    }
    user = created.data.user;
    confirmationSent = true;
  }

  const member = await access.db.from("organization_members").upsert(
    { organization_id: organizationId, user_id: user.id, role, status: "active" },
    { onConflict: "organization_id,user_id" },
  );
  if (member.error) return NextResponse.json({ error: member.error.message }, { status: 400 });

  await access.db.from("profiles").upsert(
    { user_id: user.id, nome: body.name || email, email, active_organization_id: organizationId },
    { onConflict: "user_id" },
  );
  await access.db.from("platform_audit_log").insert({
    actor_user_id: access.user.id,
    organization_id: organizationId,
    action: confirmationSent ? "user.provisioned" : "user.linked",
    entity_type: "user",
    entity_id: user.id,
    details: { email, role },
  });

  return NextResponse.json({ userId: user.id, confirmationSent, existingUser: !confirmationSent }, { status: 201 });
}
