import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const ROLES = new Set(["owner", "admin", "manager", "member"]);
const STATUSES = new Set(["active", "suspended"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ memberId: string }> }) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const { memberId } = await context.params;
  const body = await request.json();
  const current = await access.db.from("organization_members")
    .select("id,user_id,organization_id,role,status").eq("id", memberId).single();
  if (!current.data || current.error) return NextResponse.json({ error: "Usuario da empresa nao encontrado." }, { status: 404 });

  const role = String(body.role ?? current.data.role);
  const status = String(body.status ?? current.data.status);
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!ROLES.has(role) || !STATUSES.has(status) || !name || !email) {
    return NextResponse.json({ error: "Nome, e-mail, perfil ou situacao invalidos." }, { status: 400 });
  }

  const authUpdate = await access.db.auth.admin.updateUserById(current.data.user_id, { email, user_metadata: { full_name: name } });
  if (authUpdate.error) return NextResponse.json({ error: authUpdate.error.message }, { status: 400 });
  const memberUpdate = await access.db.from("organization_members").update({ role, status }).eq("id", memberId);
  if (memberUpdate.error) return NextResponse.json({ error: memberUpdate.error.message }, { status: 400 });
  const profileUpdate = await access.db.from("profiles").update({ nome: name, email }).eq("user_id", current.data.user_id);
  if (profileUpdate.error) return NextResponse.json({ error: profileUpdate.error.message }, { status: 400 });

  await access.db.from("platform_audit_log").insert({
    actor_user_id: access.user.id, organization_id: current.data.organization_id,
    action: status !== current.data.status ? `user.status.${status}` : "user.updated",
    entity_type: "user", entity_id: current.data.user_id,
    details: { email, role, status, previousRole: current.data.role, previousStatus: current.data.status },
  });
  return NextResponse.json({ ok: true });
}
