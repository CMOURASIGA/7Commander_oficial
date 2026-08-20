"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useKairosPanel } from "@/components/kairos/kairos-context";
import { useKairosCore } from "@/components/kairos/use-kairos-core";
import { KairosMessageActions } from "@/components/kairos/kairos-message-actions";
import { KairosSaveDialog } from "@/components/kairos/kairos-save-dialog";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { VoiceGlyph } from "@/components/icons/voice-icons";

/**
 * Painel do Kairos: mesma capacidade de /chat e /voice (texto, voz,
 * "Direcionar resposta") num formato compacto, disponivel em cima de
 * qualquer tela de PM sem tirar o usuario do projeto/card em que esta
 * trabalhando. Para quem preferir mais espaco, os links no rodape abrem
 * as mesmas capacidades em tela cheia.
 */
export function KairosPanel() {
  const { isOpen, seedMessage, seedProjectId, closePanel } = useKairosPanel();
  const core = useKairosCore({ initialProjectId: seedProjectId, initialInput: seedMessage ?? undefined });
  const wasOpenRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Reaplica o contexto (projeto/rascunho) sempre que o painel é reaberto a
  // partir de um lugar diferente (ex.: outro card do Kanban), sem perder a
  // conversa em andamento caso o usuario so tenha fechado e reaberto.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (seedMessage) core.setInput(seedMessage);
      if (seedProjectId && seedProjectId !== core.activeProjectId) void core.activateProject(seedProjectId);
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seedMessage, seedProjectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [core.messages]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closePanel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closePanel]);

  if (!isOpen) return null;

  return (
    <div className="kairos-panel-overlay" role="presentation">
      <button type="button" aria-label="Fechar o Kairos" className="kairos-panel-backdrop" onClick={closePanel} />
      <aside role="dialog" aria-modal="true" aria-label="Kairos" className="kairos-panel-shell">
        <header className="kairos-panel-head">
          <div>
            <p className="kairos-panel-eyebrow">Kairos</p>
            <p className="kairos-panel-sub">{core.selectedProject ? core.selectedProject.name : "Selecione um projeto"}</p>
          </div>
          <button type="button" onClick={closePanel} className="kairos-panel-close" aria-label="Fechar">×</button>
        </header>

        <div className="kairos-panel-project">
          <select
            value={core.activeProjectId ?? ""}
            onChange={(event) => void core.activateProject(event.target.value)}
            className="workspace-select"
          >
            <option value="">Selecione um projeto</option>
            {core.projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        {core.error ? <p className="mx-[1.1rem] mt-2 rounded-lg bg-(--danger-soft) px-3 py-2 text-xs text-(--danger)">{core.error}</p> : null}

        <div className="kairos-panel-messages">
          {!core.hasMessages ? (
            <p className="kairos-panel-empty">
              Pergunte algo ao Kairos, por texto ou voz — sem sair da tela em que você está.
            </p>
          ) : (
            core.messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "kairos-bubble kairos-bubble-user" : "kairos-bubble kairos-bubble-assistant"}>
                {message.role === "assistant" ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.content}</p>
                )}
                {message.role === "assistant" ? <KairosMessageActions core={core} message={message} compact /> : null}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); void core.handleTextSubmit(); }}
          className="kairos-panel-form"
        >
          <button
            type="button"
            onClick={() => (core.voiceState === "ouvindo" ? core.pauseListening() : void core.startListening())}
            disabled={!core.activeProjectId || core.isBusy}
            title={core.voiceUiState === "listening" ? "Parar captura de voz" : "Falar com o Kairos"}
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              core.voiceUiState === "listening"
                ? "orb-listening border-(--accent) bg-(--accent-soft) text-(--accent)"
                : "border-(--border) bg-white text-(--text-secondary)",
            ].join(" ")}
          >
            <VoiceGlyph state={core.voiceUiState} className="h-4 w-4" />
          </button>
          <input
            value={core.input}
            onChange={(event) => core.setInput(event.target.value)}
            placeholder="Pergunte ao Kairos..."
            className="workspace-input"
          />
          <button type="submit" disabled={core.loading || !core.canSend} className="workspace-button-primary">
            {core.loading ? "..." : "Enviar"}
          </button>
        </form>

        <footer className="kairos-panel-footer">
          <Link href="/voice" onClick={closePanel}>Abrir Voice Room</Link>
          <Link href="/chat" onClick={closePanel}>Abrir histórico completo</Link>
        </footer>
      </aside>

      <KairosSaveDialog core={core} />
    </div>
  );
}
