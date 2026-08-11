import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { ingestProjectKnowledgeFromFile } from "@/services/knowledge-ingestion";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = String(formData.get("projectId") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo 'file' obrigatorio." }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: "Campo 'projectId' obrigatorio." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await ingestProjectKnowledgeFromFile({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBuffer: buffer,
      notes: notes || undefined,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("[/api/knowledge/ingest] POST error", error);
    const message = error instanceof Error ? error.message : "Erro ao ingerir arquivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
