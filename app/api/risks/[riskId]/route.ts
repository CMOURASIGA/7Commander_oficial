import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getProjectAccessRole } from "@/services/project-service";
import { getRiskById, updateRisk } from "@/services/risk-service";
import { RiskStatus } from "@/types/risk";

type UpdateRiskPayload = {
  title?: string;
  impact?: string;
  probability?: string;
  mitigation?: string;
  owner?: string;
  status?: RiskStatus;
  decisionId?: string | null;
  taskId?: string | null;
};

function isValidStatus(value?: string): value is RiskStatus {
  return (
    value === undefined
    || value === "aberto"
    || value === "em_mitigacao"
    || value === "mitigado"
    || value === "encerrado"
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ riskId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const body = (await request.json()) as UpdateRiskPayload;
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de risco invalido." }, { status: 400 });
    }

    const { riskId } = await context.params;
    const current = await getRiskById({
      userId: auth.context.organizationId,
      riskId: riskId.trim(),
    });
    if (!current) {
      return NextResponse.json({ error: "Risco nao encontrado." }, { status: 404 });
    }

    if (current.projectId) {
      const accessRole = await getProjectAccessRole({
        userId: auth.context.organizationId,
        userEmail: auth.context.userEmail,
        projectId: current.projectId,
      });
      if (accessRole === "viewer" || accessRole === "none") {
        return NextResponse.json({ error: "Sem permissao para alterar risco." }, { status: 403 });
      }
    }

    const updated = await updateRisk({
      userId: auth.context.organizationId,
      riskId: riskId.trim(),
      patch: {
        title: body.title,
        impact: body.impact,
        probability: body.probability,
        mitigation: body.mitigation,
        owner: body.owner,
        status: body.status,
        decisionId: body.decisionId === undefined ? undefined : body.decisionId?.trim() || null,
        taskId: body.taskId === undefined ? undefined : body.taskId?.trim() || null,
      },
    });

    if (!updated) {
      return NextResponse.json({ error: "Risco nao encontrado para atualizacao." }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[/api/risks/[riskId]] PATCH error", error);
    return NextResponse.json({ error: "Erro ao atualizar risco." }, { status: 500 });
  }
}
