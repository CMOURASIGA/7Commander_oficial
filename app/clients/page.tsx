"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";

type ClientItem = {
  id: string;
  name: string;
  description: string;
  contact: string;
  status: "ativo" | "inativo";
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    contact: "",
    status: "ativo" as "ativo" | "inativo",
  });

  async function loadClients() {
    setLoading(true);
    try {
      const response = await fetch("/api/clients", { headers: getClientAuthHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar clientes.");
      setClients((payload?.data ?? []) as ClientItem[]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar clientes.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function handleSave() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const endpoint = editingId ? `/api/clients/${editingId}` : "/api/clients";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          contact: form.contact.trim(),
          status: form.status,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao salvar cliente.");

      setForm({
        name: "",
        description: "",
        contact: "",
        status: "ativo",
      });
      setEditingId(null);
      setStatusMessage(editingId ? "Cliente atualizado." : "Cliente criado.");
      await loadClients();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(client: ClientItem) {
    setEditingId(client.id);
    setStatusMessage(null);
    setForm({
      name: client.name,
      description: client.description ?? "",
      contact: client.contact ?? "",
      status: client.status ?? "ativo",
    });
  }

  async function handleDelete(clientId: string) {
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao remover cliente.");
      if (editingId === clientId) {
        setEditingId(null);
        setForm({
          name: "",
          description: "",
          contact: "",
          status: "ativo",
        });
      }
      setStatusMessage("Cliente removido.");
      await loadClients();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao remover cliente.");
    }
  }

  return (
    <section className="space-y-3">
      <PageIntro
        eyebrow="7Commander"
        title="Base de clientes"
        description="Cadastro, vínculo operacional e manutenção dos clientes conectados aos projetos do command center."
        aside={
          <>
            <StatusPill tone="accent">{clients.length} clientes</StatusPill>
            <StatusPill tone="success">
              {clients.filter((client) => client.status === "ativo").length} ativos
            </StatusPill>
          </>
        }
      />

      <SurfaceCard>
        <SectionLabel>
          {editingId ? "Editar cliente" : "Novo cliente"}
        </SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Dados cadastrais</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nome do cliente"
            className="workspace-input"
          />
          <input
            value={form.contact}
            onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            placeholder="Contato principal"
            className="workspace-input"
          />
        </div>
        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Descricao do cliente"
          className="workspace-textarea mt-2"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as "ativo" | "inativo" }))}
            className="workspace-select max-w-44"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="workspace-button-primary"
          >
            {saving ? "Salvando..." : editingId ? "Atualizar cliente" : "Criar cliente"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", description: "", contact: "", status: "ativo" });
              }}
              className="workspace-button-secondary"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
        {statusMessage ? <p className="mt-2 text-xs text-(--text-primary)">{statusMessage}</p> : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionLabel>Lista operacional</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Clientes registrados</h3>
        {loading ? (
          <p className="mt-2 text-sm text-(--text-secondary)">Carregando...</p>
        ) : clients.length === 0 ? (
          <p className="workspace-empty-state mt-3 text-sm">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="workspace-card-muted flex flex-wrap items-start justify-between gap-3 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-(--text-primary)">{client.name}</p>
                  <p className="text-xs text-(--text-secondary)">Contato: {client.contact || "Nao informado"}</p>
                  <p className="text-xs text-(--text-secondary)">Status: {client.status}</p>
                  <p className="mt-1 text-xs text-(--text-secondary)">
                    {client.description || "Sem descricao."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(client)}
                    className="workspace-button-secondary px-3 py-2 text-[13px]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(client.id)}
                    className="workspace-button-secondary px-3 py-2 text-[13px]"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </section>
  );
}
