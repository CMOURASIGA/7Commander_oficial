import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function GET(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const result = await access.db.from("organizations").select("*, organization_modules(module_key,enabled), organization_members(id,user_id,role,status,created_at)").order("created_at", { ascending: false });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ clients: result.data });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const taxId = String(body.taxId ?? "").replace(/\D/g, "");
  if (!name || taxId.length !== 14) return NextResponse.json({ error: "Nome e CNPJ valido sao obrigatorios." }, { status: 400 });
  const slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${taxId.slice(-6)}`;
  const inserted = await access.db.from("organizations").insert({
    name, legal_name: body.legalName || name, tax_id: taxId, slug, email: body.email || null, phone: body.phone || null,
    address: body.address || {}, contract_contact: body.contractContact || {}, plan: body.plan || "professional",
    contract_start: body.contractStart || null, contract_end: body.contractEnd || null, billing_day: Number(body.billingDay) || null,
    licensed_users: Number(body.licensedUsers) || 10, status: body.status || "active", quotas: body.quotas || {},
    branding: body.branding || {}, notes: body.notes || null, created_by: access.user.id,
  }).select("*").single();
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
  const modules = Array.isArray(body.modules) ? body.modules : [];
  if (modules.length) await access.db.from("organization_modules").insert(modules.map((moduleKey: string) => ({ organization_id: inserted.data.id, module_key: moduleKey, enabled: true })));
  await access.db.from("platform_audit_log").insert({ actor_user_id: access.user.id, organization_id: inserted.data.id, action: "client.created", entity_type: "organization", entity_id: inserted.data.id });
  return NextResponse.json({ client: inserted.data }, { status: 201 });
}

