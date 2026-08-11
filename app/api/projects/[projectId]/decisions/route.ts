import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createDecision, listDecisions } from "@/services/decision-service";
import { getProjectAccessRole } from "@/services/project-service";
import { DecisionStatus } from "@/types/decision";

type CreateDecisionPayload = {
  title: string;
  context?: string;
  reason?: string;
  impact?: string;
  status?: DecisionStatus;
  conversationId?: string | null;
  artifactId?: string | null;
};

function isValidStatus(status?: string): status is DecisionStatus {
  return status === undefined || ["aberta", "em_andamento", "concluida", "cancelada"].includes(status);
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

    const decisions = await listDecisions(auth.context.organizationId, normalizedProjectId);
    return NextResponse.json({
      data: decisions,
      meta: { accessRole },
    });
  } catch (error) {
    console.error("[/api/projects/[projectId]/decisions] GET error", error);
    return NextResponse.json({ error: "Erro ao listar decisoes do projeto." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const body = (await request.json()) as CreateDecisionPayload;
    const { projectId } = await context.params;
    const normalizedProjectId = projectId.trim();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Campo 'title' obrigatorio." }, { status: 400 });
    }
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status invalido." }, { status: 400 });
    }

    const accessRole = await getProjectAccessRole({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: normalizedProjectId,
    });
    if (accessRole === "none") {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }
    if (accessRole === "viewer") {
      return NextResponse.json({ error: "Sem permissao para criar decisao neste projeto." }, { status: 403 });
    }

    const created = await createDecision({
      userId: auth.context.organizationId,
      projectId: normalizedProjectId,
      title: body.title.trim(),
      context: body.context?.trim(),
      reason: body.reason?.trim(),
      impact: body.impact?.trim(),
      status: body.status ?? "aberta",
      conversationId: body.conversationId?.trim() || null,
      artifactId: body.artifactId?.trim() || null,
      source: "workspace",
      note: "Decisao criada no workspace do projeto.",
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[/api/projects/[projectId]/decisions] POST error", error);
    return NextResponse.json({ error: "Erro ao criar decisao no projeto." }, { status: 500 });
  }
}
