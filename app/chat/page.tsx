"use client";

import { FormEvent } from "react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useKairosCore } from "@/components/kairos/use-kairos-core";
import { KairosMessageActions } from "@/components/kairos/kairos-message-actions";
import { KairosSaveDialog } from "@/components/kairos/kairos-save-dialog";
import { VoiceGlyph } from "@/components/icons/voice-icons";

export default function ChatPage() {
  const core = useKairosCore();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await core.handleTextSubmit();
  }

  return (
    <section className="grid min-h-[calc(100vh-180px)] gap-3 lg:h-[calc(100vh-180px)] lg:grid-cols-[280px_1fr]">
      <aside className="workspace-card min-h-0 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text-primary)">Conversas</h2>
          <button
            type="button"
            onClick={core.startNewConversation}
            className="workspace-button-primary px-3 py-2 text-xs"
          >
            Nova
          </button>
        </div>

        {core.loadingHistory ? (
          <p className="text-sm text-(--text-secondary)">Carregando historico...</p>
        ) : core.conversations.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">Sem conversas salvas ainda.</p>
        ) : (
          <div className="space-y-2">
            {core.conversations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => core.selectConversation(item)}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-left text-xs",
                  core.conversationId === item.id
                    ? "border-(--accent) bg-(--accent-soft) text-(--text-primary)"
                    : "border-(--border) bg-(--bg-muted) text-(--text-secondary)",
                ].join(" ")}
              >
                <p className="truncate font-medium">{item.title}</p>
                <p className="mt-1 opacity-80">{item.projectName ?? "Sem projeto - legado"}</p>
                <p className="mt-1 opacity-80">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <PageIntro
          eyebrow="7Commander"
          title="Chat operacional"
          description="Conversa contextual com memória persistida, contexto do projeto e suporte às decisões operacionais — por texto ou por voz."
          aside={
            <>
              <StatusPill tone="accent">{core.conversations.length} conversas</StatusPill>
              <StatusPill tone="success">
                {core.selectedProject ? `Projeto: ${core.selectedProject.name}` : "Selecione um projeto"}
              </StatusPill>
            </>
          }
        />

        <SurfaceCard className="flex flex-wrap items-end gap-3 p-3">
          <div className="min-w-[240px] flex-1">
            <SectionLabel>{core.isNewConversation ? "Projeto desta conversa" : "Projeto vinculado à conversa"}</SectionLabel>
            <select
              value={core.activeProjectId ?? ""}
              onChange={(event) => void core.activateProject(event.target.value)}
              className="workspace-select mt-1 w-full"
            >
              <option value="">Selecione um projeto</option>
              {core.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <p className="max-w-xl text-xs text-(--text-secondary)">
            {core.isNewConversation
              ? "O projeto escolhido guia esta conversa. Trocar de projeto no meio de uma conversa em andamento inicia uma nova."
              : core.selectedConversation?.projectId
                ? "Este histórico e todas as próximas mensagens permanecem restritos ao projeto exibido."
                : "Histórico legado apenas para consulta. Para falar com o Kairos, abra uma nova conversa."}
          </p>
        </SurfaceCard>

        <SurfaceCard className="min-h-0 flex-1 overflow-y-auto p-4">
          {core.error ? (
            <p className="mb-3 rounded-lg bg-(--danger-soft) px-3 py-2 text-xs text-(--danger)">{core.error}</p>
          ) : null}
          {!core.hasMessages ? (
            <div>
              <p className="text-sm text-(--text-secondary)">
                Inicie a conversa por texto ou voz para ativar o nucleo operacional.
              </p>
              {core.icebreakers.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--text-secondary)">Sugestoes para comecar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {core.icebreakers.map((icebreaker) => (
                      <button
                        key={icebreaker}
                        type="button"
                        onClick={() => core.setInput(icebreaker)}
                        className="workspace-button-secondary text-left text-xs"
                      >
                        {icebreaker}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {core.messages.map((message) => (
                <article
                  key={message.id}
                  className={[
                    "max-w-[85%] rounded-[1.2rem] px-4 py-3 text-sm",
                    message.role === "user"
                      ? "ml-auto bg-(--accent) text-white"
                      : "border border-(--border) bg-(--bg-muted) text-(--text-primary)",
                  ].join(" ")}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                    <span className={message.role === "user" ? "text-white/75" : "text-(--accent)"}>
                      {message.role === "user" ? "Voce" : "Kairos"}
                    </span>
                    {message.source === "voice" ? (
                      <span className={message.role === "user" ? "text-white/60" : "text-(--text-tertiary)"}>· por voz</span>
                    ) : null}
                  </div>
                  {message.role === "assistant" ? (
                    <MarkdownContent content={message.content} className="chat-response-markdown" />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p
                    className={[
                      "mt-1 text-[13px]",
                      message.role === "user" ? "text-white/75" : "text-(--text-secondary)",
                    ].join(" ")}
                  >
                    {message.specialist}
                  </p>
                  {message.role === "assistant" ? <KairosMessageActions core={core} message={message} /> : null}
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>

        <form onSubmit={handleSubmit} className="workspace-card p-3">
          <SectionLabel>Entrada</SectionLabel>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (core.voiceState === "ouvindo" ? core.pauseListening() : void core.startListening())}
              disabled={!core.activeProjectId || core.isBusy}
              title={core.voiceUiState === "listening" ? "Parar captura de voz" : "Falar com o Kairos"}
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                core.voiceUiState === "listening"
                  ? "orb-listening border-(--accent) bg-(--accent-soft) text-(--accent)"
                  : "border-(--border) bg-white text-(--text-secondary) hover:border-(--accent)",
              ].join(" ")}
            >
              <VoiceGlyph state={core.voiceUiState} className="h-4 w-4" />
            </button>
            <input
              value={core.input}
              onChange={(event) => core.setInput(event.target.value)}
              placeholder="Escreva sua mensagem ou use o microfone..."
              className="workspace-input flex-1"
            />
            <button
              type="submit"
              disabled={core.loading || !core.canSend}
              className="workspace-button-primary"
            >
              {core.loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>

      <KairosSaveDialog core={core} />
    </section>
  );
}
