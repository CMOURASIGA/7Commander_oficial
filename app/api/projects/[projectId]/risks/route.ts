import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createRisk, listRisksByProject } from "@/services/risk-service";
import { getProjectAccessRole } from "@/services/project-service";
import { RiskStatus } from "@/types/risk";

type CreateRiskPayload = {
  title: string;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const { projectId } = await context.params;
    const normalizedProjectId = projectId.trim();

    const accessRole = await getProjectAccessRole({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: normalizedProjectId,
    });
    if (accessRole === "none") {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }

    const risks = await listRisksByProject({
      userId: auth.context.organizationId,
      projectId: normalizedProjectId,
    });
    return NextResponse.json({
      data: risks,
      meta: { accessRole },
    });
  } catch (error) {
    console.error("[/api/projects/[projectId]/risks] GET error", error);
    return NextResponse.json({ error: "Erro ao listar riscos do projeto." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const body = (await request.json()) as CreateRiskPayload;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Campo 'title' obrigatorio." }, { status: 400 });
    }
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de risco invalido." }, { status: 400 });
    }

    const { projectId } = await context.params;
    const normalizedProjectId = projectId.trim();
    const accessRole = await getProjectAccessRole({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: normalizedProjectId,
    });
    if (accessRole === "none") {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }
    if (accessRole === "viewer") {
      return NextResponse.json(
        { error: "Sem permissao para criar riscos neste projeto." },
        { status: 403 },
      );
    }

    const created = await createRisk({
      userId: auth.context.organizationId,
      projectId: normalizedProjectId,
      title: body.title,
      impact: body.impact,
      probability: body.probability,
      mitigation: body.mitigation,
      owner: body.owner,
      status: body.status ?? "aberto",
      decisionId: body.decisionId?.trim() || null,
      taskId: body.taskId?.trim() || null,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[/api/projects/[projectId]/risks] POST error", error);
    return NextResponse.json({ error: "Erro ao criar risco no projeto." }, { status: 500 });
  }
}
