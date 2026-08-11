import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getDecisionById, listDecisionStatusHistory } from "@/services/decision-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ decisionId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const { decisionId } = await context.params;
    const normalizedDecisionId = decisionId.trim();
    if (!normalizedDecisionId) {
      return NextResponse.json({ error: "decisionId obrigatorio." }, { status: 400 });
    }

    const decision = await getDecisionById({
      userId: auth.context.organizationId,
      decisionId: normalizedDecisionId,
    });
    if (!decision) {
      return NextResponse.json({ error: "Decisao nao encontrada." }, { status: 404 });
    }

    const history = await listDecisionStatusHistory({
      userId: auth.context.organizationId,
      decisionId: normalizedDecisionId,
    });
    return NextResponse.json({
      data: history,
      meta: {
        decisionId: normalizedDecisionId,
        currentStatus: decision.status,
      },
    });
  } catch (error) {
    console.error("[/api/decisions/[decisionId]/history] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar historico de status da decisao." }, { status: 500 });
  }
}
