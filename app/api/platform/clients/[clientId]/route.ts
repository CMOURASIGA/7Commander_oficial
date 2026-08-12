import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const VALID_STATUSES = new Set(["active", "pending", "suspended"]);

function addYears(date: Date, years: number) {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result.toISOString();
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ clientId: string }> }) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  const body = await request.json();
  const current = await access.db.from("organizations").select("*").eq("id", clientId).single();
  if (current.error || !current.data) return NextResponse.json({ error: "Empresa licenciada não encontrada." }, { status: 404 });

  const status = String(body.status ?? current.data.status);
  if (!VALID_STATUSES.has(status)) return NextResponse.json({ error: "Situação da licença inválida." }, { status: 400 });
  const name = String(body.name ?? current.data.name).trim();
  const taxId = String(body.taxId ?? current.data.tax_id ?? "").replace(/\D/g, "");
  if (!name || taxId.length !== 14) return NextResponse.json({ error: "Nome e CNPJ válido são obrigatórios." }, { status: 400 });

  const previousLifecycle = current.data.quotas?.lifecycle ?? {};
  let lifecycle = previousLifecycle;
  if (status === "suspended" && current.data.status !== "suspended") {
    const inactiveAt = new Date();
    lifecycle = { ...previousLifecycle, inactiveAt: inactiveAt.toISOString(), retentionUntil: addYears(inactiveAt, 5), inactiveReason: String(body.inactiveReason ?? "").trim() || "Inadimplência ou encerramento contratual", inactiveBy: access.user.email ?? access.user.id, reactivatedAt: null, reactivatedBy: null };
  } else if (status === "active" && current.data.status === "suspended") {
    lifecycle = { ...previousLifecycle, reactivatedAt: new Date().toISOString(), reactivatedBy: access.user.email ?? access.user.id };
  }

  const quotas = { ...(current.data.quotas ?? {}), ...(body.quotas ?? {}), lifecycle };
  const updated = await access.db.from("organizations").update({
    name, legal_name: body.legalName || name, tax_id: taxId, email: body.email || null, phone: body.phone || null,
    address: body.address || {}, contract_contact: body.contractContact || {}, plan: body.plan || "professional",
    contract_start: body.contractStart || null, contract_end: body.contractEnd || null, billing_day: Number(body.billingDay) || null,
    licensed_users: Number(body.licensedUsers) || 1, status, branding: body.branding || current.data.branding || {}, quotas,
  }).eq("id", clientId).select("*").single();
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });

  if (Array.isArray(body.modules)) {
    const existing = await access.db.from("organization_modules").select("module_key").eq("organization_id", clientId);
    const known = new Set((existing.data ?? []).map((item) => item.module_key));
    for (const moduleKey of body.modules as string[]) {
      if (known.has(moduleKey)) await access.db.from("organization_modules").update({ enabled: true }).eq("organization_id", clientId).eq("module_key", moduleKey);
      else await access.db.from("organization_modules").insert({ organization_id: clientId, module_key: moduleKey, enabled: true });
    }
    const disabled = [...known].filter((key) => !body.modules.includes(key));
    if (disabled.length) await access.db.from("organization_modules").update({ enabled: false }).eq("organization_id", clientId).in("module_key", disabled);
  }

  await access.db.from("platform_audit_log").insert({ actor_user_id: access.user.id, organization_id: clientId, action: current.data.status !== status ? `client.status.${status === "suspended" ? "inactive" : status}` : "client.updated", entity_type: "organization", entity_id: clientId, details: { previousStatus: current.data.status, status, inactiveReason: lifecycle.inactiveReason ?? null, retentionUntil: lifecycle.retentionUntil ?? null } });
  return NextResponse.json({ client: updated.data });
}
