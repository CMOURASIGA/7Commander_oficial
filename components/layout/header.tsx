"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

const PAGE_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/voice": "Voice Room",
  "/chat": "Dashboard Kairos",
  "/daily": "Daily",
  "/clients": "Clientes",
  "/projects": "Projetos",
  "/activities": "Atividades",
  "/memory": "Memoria",
  "/help": "Ajuda",
  "/settings": "Configuracoes",
  "/login": "Acesso",
};

type HeaderProps = {
  onToggleMobileNav: () => void;
  mobileNavOpen: boolean;
};

export function Header({ onToggleMobileNav, mobileNavOpen }: HeaderProps) {
  const auth = useKairosAuth();
  const pathname = usePathname();
  const email = auth.user?.email ?? null;
  const authenticated = Boolean(auth.user);
  const pageTitle = PAGE_TITLES[pathname] ?? "Workspace";
  const avatarLabel = (email ?? "7c")
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "7C";

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-(--border) bg-white/92 px-4 backdrop-blur md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileNavOpen}
          className="mobile-nav-toggle"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--accent)">Workspace ativo</p>
          <h1 className="truncate text-base font-medium text-(--text-primary)">{pageTitle}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-(--border) bg-(--bg-muted) px-3 py-1 text-[13px] text-(--text-secondary) md:inline-flex">
          Workspace operacional
        </span>
        {auth.loading ? (
          <span className="rounded-full border border-(--border) bg-white px-3 py-1 text-xs text-(--text-secondary)">
            Carregando sessao...
          </span>
        ) : authenticated ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--success)]/30 bg-(--success-soft) px-3 py-1 text-[13px] font-medium text-(--success)">
              <span className="h-2 w-2 rounded-full bg-(--success)" />
              Centro online
            </span>
            <span className="hidden text-[13px] text-(--text-secondary) md:inline">{email ?? "usuario autenticado"}</span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-(--accent) text-[13px] font-semibold text-white">
              {avatarLabel}
            </span>
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="rounded-full border border-(--border) bg-white px-3 py-1 text-[13px] font-medium text-(--text-primary)"
            >
              Sair
            </button>
          </div>
        ) : auth.required ? (
          <Link
            href="/login"
            className="rounded-full bg-(--accent) px-3 py-1 text-xs font-medium text-(--accent-contrast)"
          >
            Entrar com Google
          </Link>
        ) : (
          <span className="rounded-full border border-(--border) bg-white px-3 py-1 text-xs text-(--text-secondary)">
            Modo local
          </span>
        )}
      </div>
    </header>
  );
}
