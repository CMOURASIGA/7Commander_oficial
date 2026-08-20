"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type KairosOpenOptions = {
  /** Pre-preenche o campo de entrada do painel (o usuario ainda confirma o envio). */
  seedMessage?: string;
  /** Projeto a pre-selecionar no painel, quando aberto a partir de um contexto especifico (ex.: um card do Kanban). */
  projectId?: string | null;
};

type KairosPanelContextValue = {
  isOpen: boolean;
  seedMessage: string | null;
  seedProjectId: string | null;
  openPanel: (options?: KairosOpenOptions) => void;
  closePanel: () => void;
  /** Modulos licenciados que controlam quais atalhos de tela cheia o painel oferece. */
  chatEnabled: boolean;
  voiceEnabled: boolean;
};

const KairosPanelContext = createContext<KairosPanelContextValue | null>(null);

/**
 * Ponto de entrada unico do Kairos: qualquer tela do sistema pode chamar
 * openPanel() para abrir o assistente sem navegar para longe do que o
 * usuario esta fazendo (ex.: um card do Kanban, um projeto aberto).
 */
export function useKairosPanel(): KairosPanelContextValue {
  const context = useContext(KairosPanelContext);
  if (!context) {
    throw new Error("useKairosPanel deve ser usado dentro de KairosPanelProvider.");
  }
  return context;
}

type KairosPanelProviderProps = {
  children: React.ReactNode;
  chatEnabled?: boolean;
  voiceEnabled?: boolean;
};

export function KairosPanelProvider({ children, chatEnabled = true, voiceEnabled = true }: KairosPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seedProjectId, setSeedProjectId] = useState<string | null>(null);

  const openPanel = useCallback((options?: KairosOpenOptions) => {
    setSeedMessage(options?.seedMessage ?? null);
    setSeedProjectId(options?.projectId ?? null);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo<KairosPanelContextValue>(
    () => ({ isOpen, seedMessage, seedProjectId, openPanel, closePanel, chatEnabled, voiceEnabled }),
    [isOpen, seedMessage, seedProjectId, openPanel, closePanel, chatEnabled, voiceEnabled],
  );

  return <KairosPanelContext.Provider value={value}>{children}</KairosPanelContext.Provider>;
}
