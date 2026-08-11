import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { transcribeOpenAIAudio } from "@/services/voice/openai-stt";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const formData = await request.formData();
    const file = formData.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo 'audio' obrigatorio." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const text = await transcribeOpenAIAudio({
      fileBuffer: buffer,
      mimeType: file.type,
      fileName: file.name,
      language: "pt",
    });

    return NextResponse.json({
      data: {
        transcript: text,
      },
    });
  } catch (error) {
    console.error("[/api/voice/transcribe] POST error", error);
    const message = error instanceof Error ? error.message : "Erro ao transcrever audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

