import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getKairosProfile, saveKairosProfile } from "@/services/kairos-profile-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ data: await getKairosProfile(auth.context.organizationId) });
  } catch (error) {
    console.error("[/api/kairos/profile] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar configuracao do Kairos." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const body = await request.json();
    return NextResponse.json({ data: await saveKairosProfile(auth.context.organizationId, body ?? {}) });
  } catch (error) {
    console.error("[/api/kairos/profile] PUT error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar configuracao do Kairos." }, { status: 500 });
  }
}
