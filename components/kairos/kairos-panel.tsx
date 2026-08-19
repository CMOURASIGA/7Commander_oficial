"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { useKairosPanel } from "@/components/kairos/kairos-context";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { useToast } from "@/components/ui/toast";

type ProjectOption = { id: string; name: string; status: string };
type PanelMessage = { id: string; role: "user" | "assistant"; content: string };

function createConversationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

/**
 * Painel leve do Kairos: conversa por texto disponivel em cima de qualquer
 * tela de PM, sem tirar o usuario do projeto/card em que esta trabalhando.
 * Para o fluxo completo (Voice Room, ou registrar decisao/risco/atividade a
 * partir de uma resposta) o painel linka para /voice e /chat.
 */
export function KairosPanel() {
  const { isOpen, seedMessage, seedProjectId, closePanel } = useKairosPanel();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(createConversationId);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConversationId(createConversationId());
    setMessages([]);
    setInput(seedMessage ?? "");

    async function bootstrap() {
      const [activeResponse, listResponse] = await Promise.all([
        fetch("/api/projects/active", { headers: getClientAuthHeaders() }),
        fetch("/api/projects", { headers: getClientAuthHeaders() }),
      ]);

      if (listResponse.ok) {
        const payload = await listResponse.json();
        setProjects((payload?.data ?? []) as ProjectOption[]);
      }

      if (seedProjectId) {
        setProjectId(seedProjectId);
        return;
      }

      if (activeResponse.ok) {
        const payload = await activeResponse.json();
        setProjectId(payload?.data?.id ?? null);
      }
    }

    void bootstrap();
    // Reabastece somente quando o painel abre; seedMessage/seedProjectId sao
    // capturados no momento da abertura, nao devem reexecutar o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closePanel]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value || loading) return;
    if (!projectId) {
      showToast("Selecione um projeto para conversar com o Kairos.", "error");
      return;
    }

    const userMessage: PanelMessage = { id: `${Date.now()}-user`, role: "user", content: value };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: value,
          conversationId,
          selectedSpecialist: "core",
          projectId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao processar mensagem.");

      const assistantMessage = payload?.data?.message as { id: string; content: string } | undefined;
      if (assistantMessage) {
        setMessages((prev) => [...prev, { id: assistantMessage.id, role: "assistant", content: assistantMessage.content }]);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erro inesperado ao falar com o Kairos.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;

  return (
    <div className="kairos-panel-overlay" role="presentation">
      <button type="button" aria-label="Fechar o Kairos" className="kairos-panel-backdrop" onClick={closePanel} />
      <aside role="dialog" aria-modal="true" aria-label="Kairos" className="kairos-panel-shell">
        <header className="kairos-panel-head">
          <div>
            <p className="kairos-panel-eyebrow">Kairos</p>
            <p className="kairos-panel-sub">{selectedProject ? selectedProject.name : "Selecione um projeto"}</p>
          </div>
          <button type="button" onClick={closePanel} className="kairos-panel-close" aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="kairos-panel-project">
          <select
            value={projectId ?? ""}
            onChange={(event) => setProjectId(event.target.value || null)}
            className="workspace-select"
          >
            <option value="">Selecione um projeto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="kairos-panel-messages">
          {messages.length === 0 ? (
            <p className="kairos-panel-empty">
              Pergunte algo ao Kairos sobre este projeto — sem sair da tela em que você está.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "user" ? "kairos-bubble kairos-bubble-user" : "kairos-bubble kairos-bubble-assistant"}
              >
                {message.role === "assistant" ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="kairos-panel-form">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte ao Kairos..."
            className="workspace-input"
          />
          <button type="submit" disabled={loading || !projectId} className="workspace-button-primary">
            {loading ? "..." : "Enviar"}
          </button>
        </form>

        <footer className="kairos-panel-footer">
          <Link href="/voice" onClick={closePanel}>
            Abrir Voice Room completo
          </Link>
          <Link href="/chat" onClick={closePanel}>
            Ver histórico completo
          </Link>
        </footer>
      </aside>
    </div>
  );
}
