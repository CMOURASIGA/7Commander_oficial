"use client";

import { usePathname } from "next/navigation";
import { useKairosPanel } from "@/components/kairos/kairos-context";

/**
 * Botao persistente do Kairos, visivel em qualquer tela do workspace.
 * Substitui os antigos itens de menu "Voice Room" e "Dashboard Kairos":
 * o Kairos e o "plus" de IA do 7Commander, nao um modulo de gestao —
 * por isso ele aparece como uma camada sempre disponivel, nao como um
 * item de navegacao competindo com Projetos/Atividades.
 *
 * Respeita o mesmo licenciamento por modulo que hoje esconde os itens de
 * menu de voz/chat: se a empresa nao tem "kairos" nem "voice" liberados,
 * o botao nao aparece.
 */
export function KairosLauncher() {
  const pathname = usePathname();
  const { isOpen, isAvailable, openPanel } = useKairosPanel();

  const hiddenOnThisRoute = pathname === "/login" || pathname.startsWith("/auth/callback") || pathname.startsWith("/account/") || pathname.startsWith("/admin");
  if (hiddenOnThisRoute || isOpen || !isAvailable) return null;

  return (
    <button type="button" onClick={() => openPanel()} className="kairos-launcher" aria-label="Abrir o Kairos">
      <span className="kairos-launcher-dot" aria-hidden="true" />
      Kairos
    </button>
  );
}
