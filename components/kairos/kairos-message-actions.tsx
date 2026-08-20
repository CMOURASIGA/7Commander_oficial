"use client";

import type { KairosCore, KairosMessage } from "@/components/kairos/use-kairos-core";
import { hasSaveSuggestion } from "@/components/kairos/use-kairos-core";

/**
 * Linha de acoes abaixo de uma resposta do Kairos: ouvir em audio,
 * direcionar para decisao/risco/conhecimento/atividade, ou registrar
 * diretamente uma decisao/risco que o Kairos já identificou. Compartilhada
 * entre /chat, /voice e o painel — a mesma capacidade em qualquer lugar.
 */
export function KairosMessageActions({ core, message, compact = false }: { core: KairosCore; message: KairosMessage; compact?: boolean }) {
  const sizeClass = compact ? "px-2.5 py-1.5 text-[12px]" : "px-3 py-2 text-[13px]";

  return (
    <div className="mt-3">
      {hasSaveSuggestion(message.content, "decision") || hasSaveSuggestion(message.content, "risk") ? (
        <p className="mb-2 text-xs font-semibold text-(--accent)">O que deseja fazer com esta analise?</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void core.handleListen(message)}
          disabled={core.voiceLoadingId === message.id}
          className={`workspace-button-secondary ${sizeClass}`}
        >
          {core.voiceLoadingId === message.id
            ? "Gerando audio..."
            : core.voicePlayingId === message.id
              ? "Parar audio"
              : "Ouvir resposta"}
        </button>
        <button
          type="button"
          onClick={() => core.openDirectionPicker(message)}
          className={`workspace-button-primary ${sizeClass}`}
        >
          Direcionar resposta
        </button>
        {hasSaveSuggestion(message.content, "decision") ? (
          <button
            type="button"
            onClick={() => core.openSaveDialog("decision", message)}
            disabled={core.decisionLoadingId === message.id || core.decisionSavedIds[message.id]}
            className={`workspace-button-secondary ${sizeClass}`}
          >
            {core.decisionSavedIds[message.id] ? "Decisao salva" : "Registrar decisao sugerida"}
          </button>
        ) : null}
        {hasSaveSuggestion(message.content, "risk") ? (
          <button
            type="button"
            onClick={() => core.openSaveDialog("risk", message)}
            disabled={core.riskLoadingId === message.id || core.riskSavedIds[message.id]}
            className={`workspace-button-secondary ${sizeClass}`}
          >
            {core.riskSavedIds[message.id] ? "Risco salvo" : "Registrar risco identificado"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
