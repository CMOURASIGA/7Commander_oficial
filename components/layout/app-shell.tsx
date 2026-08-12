"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const auth = useKairosAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [licenseBlocked, setLicenseBlocked] = useState(false);
  const canBypassAuth = pathname === "/login" || pathname.startsWith("/auth/callback") || pathname.startsWith("/account/");
  const isPlatformAdmin = pathname.startsWith("/admin");
  const mustWaitForAuth = auth.required && auth.loading && !canBypassAuth;
  const mustBlock = auth.required && !auth.loading && !auth.user && !canBypassAuth;

  useEffect(() => {
    if (!mustBlock) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mustBlock, pathname, router]);

  useEffect(() => {
    if (auth.loading || !auth.user || canBypassAuth || isPlatformAdmin) { setLicenseBlocked(false); return; }
    void fetch("/api/organization/context", { headers: getClientAuthHeaders() }).then((response) => setLicenseBlocked(response.status === 403)).catch(() => undefined);
  }, [auth.loading, auth.user, canBypassAuth, isPlatformAdmin, pathname]);

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

  if (licenseBlocked) return <div className="min-h-screen bg-(--bg-page)"><main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4"><section className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-700">Acesso indisponível</p><h1 className="mt-3 text-2xl font-semibold">Licença da empresa inativa ou fora da vigência</h1><p className="mt-3 text-sm leading-6 text-slate-600">Os dados permanecem preservados. Entre em contato com a administração da Consult Services para regularizar ou reativar o acesso.</p><button type="button" onClick={() => void auth.signOut().then(() => router.replace("/login"))} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Voltar ao login</button></section></main></div>;

  return (
    <div className="min-h-screen bg-(--bg-page) md:flex md:items-stretch">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-x-hidden p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
