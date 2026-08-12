import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function GET(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Empresa licenciada obrigatoria." }, { status: 400 });
  const result = await access.db.from("platform_audit_log")
    .select("id,action,entity_type,entity_id,details,created_at,actor_user_id")
    .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ events: result.data ?? [] });
}
