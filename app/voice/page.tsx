"use client";

import Link from "next/link";
import { KeyboardEvent } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { VoiceGlyph } from "@/components/icons/voice-icons";
import { SectionLabel, StatusPill } from "@/components/ui/workspace-primitives";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { useSharedKairosCore } from "@/components/kairos/kairos-core-context";
import { KairosMessageActions } from "@/components/kairos/kairos-message-actions";
import { KairosSaveDialog } from "@/components/kairos/kairos-save-dialog";

function formatUserInitials(email: string | null) {
  const parts = (email ?? "operador")
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean);
  return (parts[0]?.[0] ?? "O").toUpperCase();
}

function getStateLabels(voiceUiState: "idle" | "listening" | "processing" | "paused") {
  if (voiceUiState === "listening") return { label: "Escutando...", sub: "Fale agora — modo contínuo ativo" };
  if (voiceUiState === "processing") return { label: "Processando...", sub: "Aguarde a resposta do Kairos" };
  if (voiceUiState === "paused") return { label: "Pausado", sub: "Clique no orbe para retomar" };
  return { label: "Pronto para iniciar", sub: "Clique no orbe para começar" };
}

export default function VoiceRoomPage() {
  const core = useSharedKairosCore();
  const stateLabels = getStateLabels(core.voiceUiState);
  const pauseLabel = core.voiceState === "pausado" ? "Retomar" : "Pausar";
  const currentDateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  const userEmail = core.auth.user?.email ?? null;
  const userInitials = formatUserInitials(userEmail);
  const activeProjectLabel = core.activeProject?.name ?? "Nenhum projeto ativo";
  const activeProjectStatusLabel = core.activeProject?.status ?? "sem projeto selecionado";

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void core.handleTextSubmit();
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
      <div className="workspace-card min-h-[calc(100vh-128px)] overflow-hidden">
        <div className="flex min-h-[calc(100vh-128px)] flex-col">
          <header className="border-b border-(--border) px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--accent)">{BRAND_NAME}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-medium text-(--text-primary)">Voice Room</h2>
                  <StatusPill tone="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-(--success)" />
                    Centro online
                  </StatusPill>
                </div>
                <p className="mt-2 max-w-xl text-[13px] text-(--text-secondary)">
                  Escolha o projeto que deve guiar o contexto desta conversa.
                </p>
              </div>

              <div className="w-full max-w-[480px] rounded-[1rem] border border-(--border) bg-(--bg-muted) p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-(--text-tertiary)">
                  Projeto em foco
                </p>
                <select
                  value={core.activeProjectId ?? ""}
                  onChange={(event) => void core.activateProject(event.target.value)}
                  className="workspace-select mt-2 min-w-0 rounded-xl bg-white pr-10 text-[13px]"
                >
                  <option value="">Selecione um projeto</option>
                  {core.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
                  <p className="min-w-0 truncate font-medium text-(--text-primary)" title={activeProjectLabel}>
                    {activeProjectLabel}
                  </p>
                  <span className="shrink-0 text-(--text-tertiary)">{core.projects.length} projetos</span>
                </div>
                <p className="mt-1 text-[13px] text-(--text-secondary)">Status: {activeProjectStatusLabel}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[var(--color-background-tertiary)] px-5 py-5">
            <div className="mb-5 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--bg-surface) px-3 py-1 text-[13px] text-(--text-tertiary)">
                Hoje, {currentDateLabel}
              </span>
            </div>

            <div aria-live="polite" className="flex flex-col gap-4">
              {core.messages.length === 0 ? (
                <div className="workspace-empty-state px-4 py-5 text-center text-[13px] italic text-(--text-tertiary)">
                  Inicie uma conversa por voz ou digite sua mensagem para abrir o histórico operacional.
                </div>
              ) : (
                core.messages.map((message) => (
                  <div
                    key={message.id}
                    className={["flex gap-3", message.role === "assistant" ? "justify-start" : "justify-end"].join(" ")}
                  >
                    <div className={message.role === "assistant" ? "flex gap-3" : "flex flex-row-reverse gap-3"}>
                      <span
                        className={[
                          "inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium",
                          message.role === "assistant" ? "bg-(--accent-soft) text-(--accent-strong)" : "bg-(--accent) text-white",
                        ].join(" ")}
                      >
                        {message.role === "assistant" ? "7C" : userInitials}
                      </span>
                      <div className="max-w-[680px]">
                        <div
                          className={[
                            "px-4 py-3 text-[13px] leading-6",
                            message.role === "assistant"
                              ? "rounded-[4px_16px_16px_16px] border border-(--border) bg-(--bg-surface) text-(--text-primary)"
                              : "rounded-[16px_4px_16px_16px] bg-(--accent) text-white",
                          ].join(" ")}
                        >
                          {message.role === "assistant" ? (
                            <MarkdownContent content={message.content} />
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                        <p className="mt-1 px-1 text-[13px] text-(--text-tertiary)">
                          {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {message.source === "voice" ? " · por voz" : ""}
                        </p>
                        {message.role === "assistant" ? <KairosMessageActions core={core} message={message} compact /> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-(--border) bg-(--bg-surface) px-5 py-4">
            <div className="relative flex items-center gap-4">
              {core.voiceUiState === "listening" ? (
                <div className="orb-ring-listening absolute -inset-2 rounded-full border border-(--border-strong)" />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (core.voiceState === "pausado") { void core.startListening(); return; }
                  if (core.voiceState === "ouvindo") { core.pauseListening(); return; }
                  void core.startListening();
                }}
                className={[
                  "relative flex h-16 w-16 items-center justify-center rounded-full border-2",
                  core.voiceUiState === "listening"
                    ? "orb-listening border-(--accent) bg-(--accent-soft) text-(--accent)"
                    : core.voiceUiState === "processing"
                      ? "border-(--success) bg-(--success-soft) text-(--success)"
                      : core.voiceUiState === "paused"
                        ? "border-(--muted-strong) bg-(--bg-muted) text-(--text-secondary)"
                        : "border-(--border-strong) bg-(--accent-soft) text-(--accent-strong)",
                ].join(" ")}
                disabled={!core.activeProjectId || core.isBusy}
              >
                <VoiceGlyph state={core.voiceUiState} />
              </button>
              <div>
                <p className="text-[13px] font-medium text-(--text-primary)">{stateLabels.label}</p>
                <p className="text-[13px] text-(--text-secondary)">{stateLabels.sub}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={core.pauseListening} disabled={core.voiceState === "inativo" || core.isBusy} className="workspace-button-secondary px-3 py-2 text-[13px]">
                {pauseLabel}
              </button>
              <button type="button" onClick={core.finishSession} className="workspace-button-danger px-3 py-2 text-[13px]">
                Encerrar
              </button>
            </div>

            <div className="flex min-w-[220px] items-center gap-2">
              <input id="modo-continuo" type="checkbox" checked={core.continuousMode} onChange={(event) => core.setContinuousMode(event.target.checked)} />
              <label htmlFor="modo-continuo" className="text-[13px] text-(--text-secondary)">
                Modo contínuo (escuta novamente após responder)
              </label>
            </div>

            <div className="relative min-w-[280px] flex-1">
              <input
                value={core.input}
                onChange={(event) => core.setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ou digite sua mensagem..."
                className="workspace-input rounded-full bg-(--bg-muted) pr-12 text-[13px]"
                disabled={!core.activeProjectId || core.isBusy}
              />
              <button
                type="button"
                onClick={() => void core.handleTextSubmit()}
                disabled={!core.activeProjectId || core.isBusy}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-(--accent) text-[13px] text-white"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="workspace-card min-h-[calc(100vh-128px)] overflow-y-auto p-4">
        <div className="space-y-4">
          <section>
            <SectionLabel>Contexto ativo</SectionLabel>
            <div className="mt-2 rounded-lg border border-(--success-border) bg-(--success-soft) px-3 py-3">
              <p className="text-[13px] font-medium text-(--success-strong)">{core.activeProject?.name ?? "Nenhum projeto ativo"}</p>
              <p className="mt-1 text-[13px] text-(--success-deep)">{core.projects.length} projetos · {core.messages.length} interações</p>
            </div>
          </section>

          <section>
            <SectionLabel>Memória da sessão</SectionLabel>
            <div className="space-y-2">
              {core.sessionMemory.length === 0 ? (
                <p className="mt-2 text-[13px] text-(--text-tertiary)">As ações da sessão aparecerão aqui em tempo real.</p>
              ) : (
                core.sessionMemory.map((entry) => (
                  <div key={entry} className="workspace-card-muted flex gap-2 px-3 py-2 text-[13px] text-(--text-primary)">
                    <span className="text-(--text-tertiary)">•</span>
                    <span>{entry}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionLabel>Ações rápidas</SectionLabel>
            <div className="space-y-2">
              <QuickAction href="/activities" label="Nova atividade" />
              <QuickAction href="/projects" label="Criar artefato" />
              <QuickAction href="/daily" label="Agendar daily" />
            </div>
          </section>

          {core.error ? (
            <section className="rounded-lg border border-(--danger-border) bg-(--danger-soft) px-3 py-3 text-[13px] text-(--danger)">
              {core.error}
            </section>
          ) : null}
        </div>
      </aside>

      <KairosSaveDialog core={core} />
    </section>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="workspace-card-muted block px-3 py-2 text-[13px] text-(--text-primary)">
      {label}
    </Link>
  );
}
