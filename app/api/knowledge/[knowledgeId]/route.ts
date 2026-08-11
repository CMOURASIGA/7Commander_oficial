import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { deleteKnowledge } from "@/services/knowledge-layer";

type RouteContext = {
  params: Promise<{
    knowledgeId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { knowledgeId } = await context.params;
    if (!knowledgeId?.trim()) {
      return NextResponse.json({ error: "Parametro 'knowledgeId' obrigatorio." }, { status: 400 });
    }

    const deleted = await deleteKnowledge({
      userId: auth.context.organizationId,
      knowledgeId: knowledgeId.trim(),
    });

    if (!deleted) {
      return NextResponse.json({ error: "Conhecimento nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/knowledge/[knowledgeId]] DELETE error", error);
    return NextResponse.json({ error: "Erro ao excluir conhecimento." }, { status: 500 });
  }
}
