import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateTextEmbedding, toVectorLiteral } from "@/services/embedding-service";
import { deleteMemory, listMemories, saveMemory } from "@/services/memory-service";
import { KnowledgeRecord } from "@/types/knowledge";

const knowledgeStore = new Map<string, KnowledgeRecord[]>();
const ALLOW_LOCAL_FALLBACK = process.env.KAIROS_ENABLE_LOCAL_FALLBACK === "true";
const LEGACY_KNOWLEDGE_PREFIX = "KAIROS_KNOWLEDGE::";

type KnowledgeRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  titulo: string;
  categoria: string;
  fonte: string;
  conteudo: string;
  created_at: string;
};

function mapKnowledgeRow(row: KnowledgeRow): KnowledgeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    title: row.titulo,
    category: row.categoria,
    source: row.fonte,
    content: row.conteudo,
    createdAt: row.created_at,
  };
}

function isKnowledgeSchemaMissing(message?: string): boolean {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("knowledge_base") ||
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("42p01")
  );
}

function toWellFormedSafe(value: string): string {
  const native = (value as unknown as { toWellFormed?: () => string }).toWellFormed;
  if (typeof native === "function") {
    return native.call(value);
  }

  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += value[index] + value[index + 1];
        index += 1;
      } else {
        output += "\uFFFD";
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      output += "\uFFFD";
      continue;
    }
    output += value[index];
  }
  return output;
}

function sanitizeForDatabase(input: string): string {
  return toWellFormedSafe(input)
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function packLegacyKnowledgePayload(input: {
  projectId?: string | null;
  title: string;
  category: string;
  source: string;
  content: string;
}): string {
  return `${LEGACY_KNOWLEDGE_PREFIX}${JSON.stringify({
    projectId: input.projectId ?? null,
    title: input.title,
    category: input.category,
    source: input.source,
    content: input.content,
  })}`;
}

function unpackLegacyKnowledgePayload(value: string): {
  projectId: string | null;
  title: string;
  category: string;
  source: string;
  content: string;
} | null {
  if (!value.startsWith(LEGACY_KNOWLEDGE_PREFIX)) return null;
  const raw = value.slice(LEGACY_KNOWLEDGE_PREFIX.length);
  try {
    const parsed = JSON.parse(raw) as {
      projectId?: string | null;
      title?: string;
      category?: string;
      source?: string;
      content?: string;
    };

    const title = parsed.title?.trim() ?? "";
    const category = parsed.category?.trim() ?? "";
    const source = parsed.source?.trim() ?? "";
    const content = parsed.content?.trim() ?? "";
    if (!title || !category || !source || !content) return null;

    return {
      projectId: parsed.projectId?.trim() || null,
      title,
      category,
      source,
      content,
    };
  } catch {
    return null;
  }
}

async function saveKnowledgeInLegacyMemory(input: {
  userId: string;
  projectId?: string | null;
  title: string;
  category: string;
  source: string;
  content: string;
}): Promise<KnowledgeRecord> {
  const saved = await saveMemory({
    userId: input.userId,
    type: "knowledge_legacy",
    priority: "P1",
    content: packLegacyKnowledgePayload({
      projectId: input.projectId ?? null,
      title: input.title,
      category: input.category,
      source: input.source,
      content: input.content,
    }),
  });

  return {
    id: saved.id,
    userId: saved.userId,
    projectId: input.projectId ?? null,
    title: input.title,
    category: input.category,
    source: input.source,
    content: input.content,
    createdAt: saved.createdAt,
  };
}

export async function saveKnowledge(input: {
  userId: string;
  projectId?: string | null;
  title: string;
  category?: string;
  source?: string;
  content: string;
}): Promise<KnowledgeRecord> {
  const supabase = getSupabaseServerClient();
  let lastError: string | null = null;
  const category = sanitizeForDatabase(input.category?.trim() || "geral") || "geral";
  const source = sanitizeForDatabase(input.source?.trim() || "manual") || "manual";
  const title = sanitizeForDatabase(input.title) || "Conhecimento";
  const content = sanitizeForDatabase(input.content);

  if (!content) {
    throw new Error("Conteudo de conhecimento vazio apos sanitizacao.");
  }

  if (supabase) {
    try {
      const inserted = await supabase
        .from("knowledge_base")
        .insert({
          user_id: input.userId,
          project_id: input.projectId ?? null,
          titulo: title,
          categoria: category,
          fonte: source,
          conteudo: content,
        })
        .select("id, user_id, project_id, titulo, categoria, fonte, conteudo, created_at")
        .single();

      if (!inserted.error && inserted.data) {
        const base = mapKnowledgeRow(inserted.data);
        const embedding = await generateTextEmbedding(content);
        if (embedding?.length) {
          try {
            const chunk = await supabase
              .from("knowledge_chunks")
              .insert({
                knowledge_id: base.id,
                user_id: input.userId,
                project_id: input.projectId ?? null,
                chunk_index: 0,
                conteudo: content,
              })
              .select("id")
              .single();

            if (!chunk.error && chunk.data?.id) {
              await supabase.from("knowledge_embeddings").insert({
                chunk_id: chunk.data.id,
                user_id: input.userId,
                project_id: input.projectId ?? null,
                embedding: toVectorLiteral(embedding),
              });
            }
          } catch {
            // best-effort only
          }
        }

        return base;
      }
      if (inserted.error) {
        lastError = inserted.error.message;
        if (isKnowledgeSchemaMissing(inserted.error.message)) {
          return saveKnowledgeInLegacyMemory({
            userId: input.userId,
            projectId: input.projectId ?? null,
            title,
            category,
            source,
            content,
          });
        }
      }
    } catch {
      // fallback local below
    }
  }

  if (ALLOW_LOCAL_FALLBACK) {
    const local: KnowledgeRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      projectId: input.projectId ?? null,
      title,
      category,
      source,
      content,
      createdAt: new Date().toISOString(),
    };

    const current = knowledgeStore.get(input.userId) ?? [];
    current.unshift(local);
    knowledgeStore.set(input.userId, current.slice(0, 500));
    return local;
  }

  throw new Error(
    [
      "Falha ao salvar conhecimento no Supabase.",
      lastError ? `Detalhe: ${lastError}.` : "",
      "Valide se a migration 030_voicefirst_project_knowledge.sql foi aplicada.",
      "Se quiser modo local temporario, use KAIROS_ENABLE_LOCAL_FALLBACK=true.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export async function listKnowledge(userId: string, projectId?: string | null): Promise<KnowledgeRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      let query = supabase
        .from("knowledge_base")
        .select("id, user_id, project_id, titulo, categoria, fonte, conteudo, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const result = await query;
      if (!result.error && result.data) {
        return result.data.map(mapKnowledgeRow);
      }
      if (isKnowledgeSchemaMissing(result.error?.message)) {
        const memories = await listMemories(userId);
        return memories
          .map((memory) => {
            const unpacked = unpackLegacyKnowledgePayload(memory.content);
            if (!unpacked) return null;
            return {
              id: memory.id,
              userId: memory.userId,
              projectId: unpacked.projectId,
              title: unpacked.title,
              category: unpacked.category,
              source: unpacked.source,
              content: unpacked.content,
              createdAt: memory.createdAt,
            } as KnowledgeRecord;
          })
          .filter((item): item is KnowledgeRecord => Boolean(item))
          .filter((item) => (projectId ? item.projectId === projectId : true))
          .slice(0, 200);
      }
    } catch {
      // fallback local below
    }
  }

  const local = ALLOW_LOCAL_FALLBACK ? knowledgeStore.get(userId) ?? [] : [];
  return projectId ? local.filter((item) => item.projectId === projectId) : local;
}

export async function deleteKnowledge(params: { userId: string; knowledgeId: string }): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  let lastError: string | null = null;

  if (supabase) {
    try {
      const baseRow = await supabase
        .from("knowledge_base")
        .select("id")
        .eq("id", params.knowledgeId)
        .eq("user_id", params.userId)
        .single();

      if (!baseRow.error && baseRow.data?.id) {
        const chunkIdsResult = await supabase
          .from("knowledge_chunks")
          .select("id")
          .eq("knowledge_id", params.knowledgeId)
          .eq("user_id", params.userId);
        const chunkIds = (chunkIdsResult.data ?? []).map((item) => item.id).filter((item): item is string => Boolean(item));

        if (chunkIds.length > 0) {
          await supabase.from("knowledge_embeddings").delete().eq("user_id", params.userId).in("chunk_id", chunkIds);
          await supabase.from("knowledge_chunks").delete().eq("user_id", params.userId).in("id", chunkIds);
        }

        const deleted = await supabase.from("knowledge_base").delete().eq("id", params.knowledgeId).eq("user_id", params.userId);
        if (!deleted.error) return true;
        lastError = deleted.error.message;
      } else if (baseRow.error) {
        lastError = baseRow.error.message;
        if (isKnowledgeSchemaMissing(baseRow.error.message)) {
          return deleteMemory({ userId: params.userId, memoryId: params.knowledgeId });
        }
      }
    } catch {
      // Local fallback below.
    }
  }
  if (ALLOW_LOCAL_FALLBACK) {
    const current = knowledgeStore.get(params.userId) ?? [];
    const next = current.filter((item) => item.id !== params.knowledgeId);
    knowledgeStore.set(params.userId, next);
    return next.length !== current.length;
  }

  if (lastError && !isKnowledgeSchemaMissing(lastError)) throw new Error(lastError);
  return false;
}
