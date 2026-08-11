import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { deleteKnowledge, listKnowledge, saveKnowledge } from "@/services/knowledge-layer";

type CreateKnowledgePayload = {
  title: string;
  content: string;
  category?: string;
  source?: string;
  projectId?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim() || null;
    const items = await listKnowledge(auth.context.organizationId, projectId);
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[/api/knowledge] GET error", error);
    return NextResponse.json({ error: "Erro ao listar conhecimento." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as CreateKnowledgePayload;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Campo 'title' obrigatorio." }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Campo 'content' obrigatorio." }, { status: 400 });
    }

    const item = await saveKnowledge({
      userId: auth.context.organizationId,
      projectId: body.projectId ?? null,
      title: body.title.trim(),
      content: body.content.trim(),
      category: body.category?.trim(),
      source: body.source?.trim(),
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("[/api/knowledge] POST error", error);
    return NextResponse.json({ error: "Erro ao salvar conhecimento." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;
    const knowledgeId = new URL(request.url).searchParams.get("id")?.trim();
    if (!knowledgeId) return NextResponse.json({ error: "Identificador do conhecimento obrigatorio." }, { status: 400 });
    const deleted = await deleteKnowledge({ userId: auth.context.organizationId, knowledgeId });
    if (!deleted) return NextResponse.json({ error: "Documento nao encontrado ou sem permissao." }, { status: 404 });
    return NextResponse.json({ data: { id: knowledgeId } });
  } catch (error) {
    console.error("[/api/knowledge] DELETE error", error);
    return NextResponse.json({ error: "Erro ao excluir documento." }, { status: 500 });
  }
}
