"use client";

import { createContext, useContext } from "react";
import { useKairosCore, type KairosCore } from "@/components/kairos/use-kairos-core";

/**
 * Instancia unica do nucleo do Kairos, montada uma vez acima das rotas.
 * /chat, /voice e o painel flutuante leem essa MESMA instancia em vez de
 * cada um criar a sua -- sem isso, sair de /chat para outra tela e voltar
 * desmonta a pagina (comportamento normal do Next.js) e reseta a conversa
 * em memoria, mesmo que o historico continue salvo no servidor.
 */
const KairosCoreContext = createContext<KairosCore | null>(null);

export function KairosCoreProvider({ children }: { children: React.ReactNode }) {
  const core = useKairosCore();
  return <KairosCoreContext.Provider value={core}>{children}</KairosCoreContext.Provider>;
}

export function useSharedKairosCore(): KairosCore {
  const context = useContext(KairosCoreContext);
  if (!context) {
    throw new Error("useSharedKairosCore deve ser usado dentro de KairosCoreProvider.");
  }
  return context;
}
