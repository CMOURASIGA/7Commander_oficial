import { toFile } from "openai/uploads";
import { getOpenAIClient } from "@/lib/openai";

type TranscribeInput = {
  fileBuffer: ArrayBuffer;
  mimeType?: string;
  fileName?: string;
  language?: string;
};

function inferExtension(mimeType?: string): string {
  const value = (mimeType ?? "").toLowerCase();
  if (value.includes("webm")) return "webm";
  if (value.includes("wav")) return "wav";
  if (value.includes("mpeg") || value.includes("mp3")) return "mp3";
  if (value.includes("ogg")) return "ogg";
  if (value.includes("mp4")) return "mp4";
  if (value.includes("m4a")) return "m4a";
  return "webm";
}

export async function transcribeOpenAIAudio(input: TranscribeInput): Promise<string> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  const model = process.env.OPENAI_STT_MODEL?.trim() || "gpt-4o-mini-transcribe";
  const extension = inferExtension(input.mimeType);
  const fileName = input.fileName?.trim() || `voice-input.${extension}`;

  const upload = await toFile(Buffer.from(input.fileBuffer), fileName, {
    type: input.mimeType || "audio/webm",
  });

  const response = await openai.audio.transcriptions.create({
    file: upload,
    model,
    language: input.language || "pt",
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("Nao foi possivel transcrever audio.");
  }

  return text;
}

