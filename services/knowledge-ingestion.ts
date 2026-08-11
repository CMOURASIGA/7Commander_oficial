import { getOpenAIClient } from "@/lib/openai";
import { saveKnowledge } from "@/services/knowledge-layer";
import { getProjectById, updateProject } from "@/services/project-service";
import { transcribeOpenAIAudio } from "@/services/voice/openai-stt";
import { toFile } from "openai/uploads";
import mammoth from "mammoth";

type IngestInput = {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  fileName: string;
  mimeType: string;
  fileBuffer: ArrayBuffer;
  notes?: string;
};

type IngestResult = {
  title: string;
  summary: string;
  projectUpdated: boolean;
  appliedFields: string[];
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isImageType(mimeType: string): boolean {
  return /^image\/(png|jpeg|jpg|webp|gif)$/i.test(mimeType);
}

function isAudioType(mimeType: string): boolean {
  return /^audio\//i.test(mimeType);
}

function isTextType(mimeType: string): boolean {
  return /^text\//i.test(mimeType) || /(json|xml|csv|yaml|yml)/i.test(mimeType);
}

function isDocxType(input: IngestInput): boolean {
  const normalizedMime = input.mimeType.toLowerCase();
  const normalizedName = input.fileName.toLowerCase();
  return (
    normalizedMime.includes("officedocument.wordprocessingml.document") ||
    normalizedName.endsWith(".docx")
  );
}

function toDataUrl(mimeType: string, fileBuffer: ArrayBuffer): string {
  const base64 = Buffer.from(fileBuffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function decodeTextFile(fileBuffer: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(fileBuffer));
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxText(fileBuffer: ArrayBuffer): Promise<string> {
  const extraction = await mammoth.extractRawText({
    buffer: Buffer.from(fileBuffer),
  });

  const cleaned = normalizeExtractedText(extraction.value ?? "");
  return cleaned;
}

async function extractRawContent(input: IngestInput): Promise<string> {
  if (isDocxType(input)) {
    const docxContent = await extractDocxText(input.fileBuffer);
    if (docxContent) {
      return docxContent;
    }
  }

  if (isTextType(input.mimeType)) {
    return normalizeExtractedText(decodeTextFile(input.fileBuffer));
  }

  if (isAudioType(input.mimeType)) {
    return transcribeOpenAIAudio({
      fileBuffer: input.fileBuffer,
      fileName: input.fileName,
      mimeType: input.mimeType,
      language: "pt",
    });
  }

  const openai = getOpenAIClient();
  if (!openai) throw new Error("OPENAI_API_KEY nao configurada para ingestao de arquivos.");

  const model = process.env.KAIROS_INGEST_MODEL?.trim() || "gpt-4.1";

  if (isImageType(input.mimeType)) {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Analise a imagem e extraia o conteudo util para contexto de projeto.",
                "Se houver BPMN/fluxo, descreva atores, etapas, gateways, riscos e lacunas.",
                "Responda em texto objetivo em portugues do Brasil.",
              ].join(" "),
            },
            {
              type: "input_image",
              image_url: toDataUrl(input.mimeType, input.fileBuffer),
              detail: "high",
            },
          ],
        },
      ],
    });

    return normalizeExtractedText(response.output_text ?? "");
  }

  const upload = await toFile(Buffer.from(input.fileBuffer), input.fileName, {
    type: input.mimeType || "application/octet-stream",
  });
  const file = await openai.files.create({
    file: upload,
    purpose: "user_data",
  });

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: file.id,
          },
          {
            type: "input_text",
            text: [
              "Extraia e organize o conteudo do arquivo para uso operacional em projeto.",
              "Se houver texto, mantenha termos-chave, requisitos, regras, decisoes e riscos.",
              "Responda em texto objetivo em portugues do Brasil.",
            ].join(" "),
          },
        ],
      },
    ],
  });

  try {
    await openai.files.del(file.id);
  } catch {
    // best-effort cleanup
  }

  return normalizeExtractedText(response.output_text ?? "");
}

async function enrichProjectFromContent(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
  content: string;
  notes?: string;
}): Promise<{ updated: boolean; appliedFields: string[] }> {
  const project = await getProjectById({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });
  if (!project) return { updated: false, appliedFields: [] };

  const openai = getOpenAIClient();
  if (!openai) return { updated: false, appliedFields: [] };

  const model = process.env.KAIROS_INGEST_MODEL?.trim() || "gpt-4o-mini";
  const response = await openai.responses.create({
    model,
    instructions: [
      "Voce analisa conteudo de projeto e sugere atualizacao de campos estruturais.",
      "Retorne apenas JSON valido.",
      'Formato: {"objective":"","context":"","stakeholders":"","maturity":"","tags":[]}.',
      "Se um campo nao tiver base suficiente, retorne string vazia ou array vazio.",
    ].join(" "),
    input: JSON.stringify({
      project: {
        name: project.name,
        objective: project.objective,
        context: project.context,
        stakeholders: project.stakeholders,
        maturity: project.maturity,
        tags: project.tags,
      },
      notes: params.notes ?? "",
      content: params.content.slice(0, 20000),
    }),
  });

  const raw = response.output_text?.trim();
  if (!raw) return { updated: false, appliedFields: [] };

  let parsed: {
    objective?: string;
    context?: string;
    stakeholders?: string;
    maturity?: string;
    tags?: string[];
  } | null = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { updated: false, appliedFields: [] };
  }

  if (!parsed) return { updated: false, appliedFields: [] };

  const patch: {
    objective?: string;
    context?: string;
    stakeholders?: string;
    maturity?: string;
    tags?: string[];
  } = {};
  const appliedFields: string[] = [];

  if (typeof parsed.objective === "string" && normalizeText(parsed.objective)) {
    patch.objective = normalizeText(parsed.objective);
    appliedFields.push("objective");
  }
  if (typeof parsed.context === "string" && normalizeText(parsed.context)) {
    patch.context = normalizeText(parsed.context);
    appliedFields.push("context");
  }
  if (typeof parsed.stakeholders === "string" && normalizeText(parsed.stakeholders)) {
    patch.stakeholders = normalizeText(parsed.stakeholders);
    appliedFields.push("stakeholders");
  }
  if (typeof parsed.maturity === "string" && normalizeText(parsed.maturity)) {
    patch.maturity = normalizeText(parsed.maturity);
    appliedFields.push("maturity");
  }
  if (Array.isArray(parsed.tags)) {
    const tags = parsed.tags
      .map((item) => (typeof item === "string" ? normalizeText(item) : ""))
      .filter(Boolean)
      .slice(0, 12);
    if (tags.length) {
      patch.tags = Array.from(new Set([...(project.tags ?? []), ...tags]));
      appliedFields.push("tags");
    }
  }

  if (!appliedFields.length) return { updated: false, appliedFields };

  const updated = await updateProject({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
    patch,
  });

  return { updated: Boolean(updated), appliedFields };
}

export async function ingestProjectKnowledgeFromFile(input: IngestInput): Promise<IngestResult> {
  const content = await extractRawContent(input);
  if (!content) {
    throw new Error("Nao foi possivel extrair conteudo util do arquivo enviado.");
  }

  const title = normalizeText(input.fileName) || "Documento do projeto";
  const mergedContent = input.notes?.trim()
    ? `Notas do usuario: ${input.notes.trim()}\n\nConteudo extraido:\n${content}`
    : content;

  const summary = mergedContent.slice(0, 15000);
  await saveKnowledge({
    userId: input.userId,
    projectId: input.projectId,
    title,
    category: "documento",
    source: "upload",
    content: summary,
  });

  const enrichment = await enrichProjectFromContent({
    userId: input.userId,
    userEmail: input.userEmail,
    projectId: input.projectId,
    content: mergedContent,
    notes: input.notes,
  });

  return {
    title,
    summary: summary.slice(0, 600),
    projectUpdated: enrichment.updated,
    appliedFields: enrichment.appliedFields,
  };
}
