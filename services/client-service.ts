import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ClientRecord, ClientStatus, CreateClientInput, UpdateClientInput } from "@/types/client";

const clientStore = new Map<string, ClientRecord[]>();
const ALLOW_LOCAL_FALLBACK = process.env.KAIROS_ENABLE_LOCAL_FALLBACK === "true";

type ClientRow = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  contato: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeStatus(value?: string | null): ClientStatus {
  return value === "inativo" ? "inativo" : "ativo";
}

function mapClientRow(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.nome,
    description: row.descricao ?? "",
    contact: row.contato ?? "",
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function saveLocalClient(input: CreateClientInput): ClientRecord {
  const now = new Date().toISOString();
  const created: ClientRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    contact: input.contact?.trim() ?? "",
    status: normalizeStatus(input.status),
    createdAt: now,
    updatedAt: now,
  };
  const current = clientStore.get(input.userId) ?? [];
  current.unshift(created);
  clientStore.set(input.userId, current.slice(0, 300));
  return created;
}

export async function listClients(userId: string): Promise<ClientRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("clients")
      .select("id, user_id, nome, descricao, contato, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(300);
    if (!result.error && result.data) {
      return (result.data as ClientRow[]).map(mapClientRow);
    }
  }
  return ALLOW_LOCAL_FALLBACK ? clientStore.get(userId) ?? [] : [];
}

export async function getClientById(params: {
  userId: string;
  clientId: string;
}): Promise<ClientRecord | null> {
  const clients = await listClients(params.userId);
  return clients.find((item) => item.id === params.clientId) ?? null;
}

export async function createClient(input: CreateClientInput): Promise<ClientRecord> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const inserted = await supabase
      .from("clients")
      .insert({
        user_id: input.userId,
        nome: input.name.trim(),
        descricao: input.description?.trim() || null,
        contato: input.contact?.trim() || null,
        status: normalizeStatus(input.status),
      })
      .select("id, user_id, nome, descricao, contato, status, created_at, updated_at")
      .single();

    if (!inserted.error && inserted.data) {
      return mapClientRow(inserted.data as ClientRow);
    }
  }

  if (ALLOW_LOCAL_FALLBACK) {
    return saveLocalClient(input);
  }
  throw new Error("Falha ao criar cliente no Supabase.");
}

export async function updateClient(input: UpdateClientInput): Promise<ClientRecord | null> {
  const current = await getClientById({
    userId: input.userId,
    clientId: input.clientId,
  });
  if (!current) return null;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const patch: {
      nome?: string;
      descricao?: string | null;
      contato?: string | null;
      status?: ClientStatus;
    } = {};

    if (typeof input.patch.name === "string") patch.nome = input.patch.name.trim();
    if (typeof input.patch.description === "string") patch.descricao = input.patch.description.trim() || null;
    if (typeof input.patch.contact === "string") patch.contato = input.patch.contact.trim() || null;
    if (typeof input.patch.status === "string") patch.status = normalizeStatus(input.patch.status);

    const updated = await supabase
      .from("clients")
      .update(patch)
      .eq("id", input.clientId)
      .eq("user_id", input.userId)
      .select("id, user_id, nome, descricao, contato, status, created_at, updated_at")
      .single();

    if (!updated.error && updated.data) {
      return mapClientRow(updated.data as ClientRow);
    }
  }

  if (!ALLOW_LOCAL_FALLBACK) return null;
  const local = clientStore.get(input.userId) ?? [];
  const target = local.find((item) => item.id === input.clientId);
  if (!target) return null;
  if (typeof input.patch.name === "string") target.name = input.patch.name.trim();
  if (typeof input.patch.description === "string") target.description = input.patch.description.trim();
  if (typeof input.patch.contact === "string") target.contact = input.patch.contact.trim();
  if (typeof input.patch.status === "string") target.status = normalizeStatus(input.patch.status);
  target.updatedAt = new Date().toISOString();
  return target;
}

export async function deleteClient(params: {
  userId: string;
  clientId: string;
}): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("clients")
      .delete()
      .eq("id", params.clientId)
      .eq("user_id", params.userId);
    if (!result.error) return true;
  }

  if (!ALLOW_LOCAL_FALLBACK) return false;
  const local = clientStore.get(params.userId) ?? [];
  const remaining = local.filter((item) => item.id !== params.clientId);
  clientStore.set(params.userId, remaining);
  return remaining.length !== local.length;
}
