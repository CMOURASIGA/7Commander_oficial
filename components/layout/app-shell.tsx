"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { applyClientBrandSettings, completeClientBrand, DEFAULT_CLIENT_BRAND, type ClientBrandSettings } from "@/lib/brand-settings";
import { canAccessWorkspacePath, isWorkspaceModuleEnabled } from "@/lib/access-control";
import type { OrganizationRole } from "@/lib/organization-context";
import { KairosCoreProvider } from "@/components/kairos/kairos-core-context";
import { KairosPanelProvider } from "@/components/kairos/kairos-context";
import { KairosLauncher } from "@/components/kairos/kairos-launcher";
import { KairosPanel } from "@/components/kairos/kairos-panel";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const auth = useKairosAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [licenseBlocked, setLicenseBlocked] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextResolved, setContextResolved] = useState(false);
  const [clientBrand, setClientBrand] = useState<ClientBrandSettings>(DEFAULT_CLIENT_BRAND);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole>("member");
  const canBypassAuth = pathname === "/login" || pathname.startsWith("/auth/callback") || pathname.startsWith("/account/");
  const isPlatformAdmin = pathname.startsWith("/admin");
  const mustWaitForAuth = auth.required && auth.loading && !canBypassAuth;
  const mustBlock = auth.required && !auth.loading && !auth.user && !canBypassAuth;

  useEffect(() => {
    if (!mustBlock) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mustBlock, pathname, router]);

  useEffect(() => {
    if (auth.loading || !auth.user || canBypassAuth || isPlatformAdmin) { setLicenseBlocked(false); setContextLoading(false); setContextResolved(false); return; }
    let active = true;
    setContextLoading(true);
    void fetch("/api/organization/context", { headers: getClientAuthHeaders() }).then(async (response) => {
      if (!active) return;
      if (!response.ok) { setLicenseBlocked(response.status === 403); setContextResolved(true); return; }
      const result = await response.json();
      const branding = result.organization?.branding ?? {};
      const next = completeClientBrand({ clientName: branding.displayName || result.organization?.name || DEFAULT_CLIENT_BRAND.clientName, logoUrl: branding.logoUrl || DEFAULT_CLIENT_BRAND.logoUrl, primaryColor: branding.primaryColor || DEFAULT_CLIENT_BRAND.primaryColor, highlightColor: branding.secondaryColor || DEFAULT_CLIENT_BRAND.highlightColor, sidebarColor: branding.sidebarColor, softColor: branding.softColor, contrastColor: branding.contrastColor });
      window.localStorage.setItem("7commander-client-brand", JSON.stringify(next));
      applyClientBrandSettings(next);
      setClientBrand(next);
      setEnabledModules((result.organization?.organization_modules ?? []).filter((item: { enabled: boolean }) => item.enabled).map((item: { module_key: string }) => item.module_key));
      setOrganizationRole(result.role || "member");
      setLicenseBlocked(result.licenseAllowed === false);
      setContextResolved(true);
    }).catch(() => { if (active) { setLicenseBlocked(true); setContextResolved(true); } }).finally(() => { if (active) setContextLoading(false); });
    return () => { active = false; };
  }, [auth.loading, auth.user, canBypassAuth, isPlatformAdmin]);

  if (canBypassAuth) {
    return (
      <div className="min-h-screen bg-(--bg-page)">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-6">
          {children}
        </main>
      </div>
    );
  }

  if (mustWaitForAuth) {
    return (
      <div className="min-h-screen bg-(--bg-page)">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-6">
          <section className="w-full max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
              Autenticacao
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">Validando sessao</h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              Aguarde enquanto o Kairos confirma o acesso antes de liberar o workspace.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (mustBlock) {
    return (
      <div className="min-h-screen bg-(--bg-page)">
        <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-6">
          <section className="w-full max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 text-center shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
              Acesso protegido
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">Redirecionando para login</h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              O workspace requer autenticacao antes de carregar os modulos operacionais.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (isPlatformAdmin) return <>{children}</>;

  if (contextLoading || !contextResolved) return <div className="min-h-screen bg-(--bg-page)"><main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4"><section className="w-full rounded-3xl border border-(--border) bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Workspace</p><h1 className="mt-3 text-2xl font-semibold">Preparando o ambiente da sua empresa</h1><p className="mt-3 text-sm text-slate-600">Carregando identidade visual, licença, perfil e módulos liberados.</p></section></main></div>;

  if (licenseBlocked) return <div className="min-h-screen bg-(--bg-page)"><main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4"><section className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-700">Acesso indisponível</p><h1 className="mt-3 text-2xl font-semibold">Licença da empresa inativa ou fora da vigência</h1><p className="mt-3 text-sm leading-6 text-slate-600">Os dados permanecem preservados. Entre em contato com a administração da Consult Services para regularizar ou reativar o acesso.</p><button type="button" onClick={() => void auth.signOut().then(() => router.replace("/login"))} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Voltar ao login</button></section></main></div>;

  if (!canAccessWorkspacePath(organizationRole, pathname) || !isWorkspaceModuleEnabled(pathname, enabledModules)) return <div className="min-h-screen bg-(--bg-page)"><main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4"><section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[.2em] text-(--accent)">Acesso restrito</p><h1 className="mt-3 text-2xl font-semibold">Seu perfil ou contrato não permite acessar esta área</h1><p className="mt-3 text-sm leading-6 text-slate-600">A área pode estar fora dos módulos contratados ou indisponível para seu perfil. Solicite ao responsável ou administrador da empresa.</p><button type="button" onClick={() => router.replace("/")} className="mt-6 rounded-xl bg-(--accent) px-5 py-3 text-sm font-semibold text-white">Voltar ao início</button></section></main></div>;

  // O Kairos (chat/voz + Direcionar resposta) so aparece como camada flutuante
  // quando a empresa contratou o modulo "kairos" (dashboard/chat) ou "voice"
  // (Voice Room) -- o mesmo nucleo compartilhado atende as duas superficies,
  // entao a disponibilidade do launcher segue qualquer um dos dois.
  const kairosChatEnabled = enabledModules.includes("kairos");
  const kairosVoiceEnabled = enabledModules.includes("voice");
  const kairosAvailable = kairosChatEnabled || kairosVoiceEnabled;

  const shell = (
    <div className="min-h-screen bg-(--bg-page) md:flex md:items-stretch">
      <Sidebar clientBrand={clientBrand} enabledModules={enabledModules} role={organizationRole} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-x-hidden p-4 md:p-5">{children}</main>
      </div>
      {kairosAvailable ? (
        <>
          <KairosLauncher />
          <KairosPanel />
        </>
      ) : null}
    </div>
  );

  // KairosPanelProvider e sempre montado (e leve: so guarda estado de
  // aberto/fechado) para que qualquer tela -- ex.: o chip "Kairos" num card
  // do Kanban -- possa chamar useKairosPanel() sem quebrar quando o modulo
  // nao esta licenciado; chatEnabled/voiceEnabled deixam essas telas saberem
  // se devem oferecer o atalho. Ja o KairosCoreProvider (que busca projetos,
  // conversas etc.) so monta quando o Kairos esta de fato disponivel.
  return (
    <KairosPanelProvider chatEnabled={kairosChatEnabled} voiceEnabled={kairosVoiceEnabled}>
      {kairosAvailable ? <KairosCoreProvider>{shell}</KairosCoreProvider> : shell}
    </KairosPanelProvider>
  );
}
