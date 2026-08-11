import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getDailySnapshot } from "@/services/daily-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    return NextResponse.json({ data: await getDailySnapshot(auth.context.organizationId) });
  } catch (error) {
    console.error("[/api/daily] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar a Daily." }, { status: 500 });
  }
}
