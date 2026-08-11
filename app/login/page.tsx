"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

export default function LoginPage() {
  const auth = useKairosAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next")?.trim() || "/");
  }, []);

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    router.replace(nextPath);
  }, [auth.loading, auth.user, nextPath, router]);

  return (
    <section className="mx-auto max-w-xl rounded-[1.8rem] border border-(--border) bg-(--bg-surface) p-8 shadow-[var(--shadow-card)]">
      <div className="flex justify-center">
        <BrandLockup align="center" size="lg" />
      </div>
      <div className="mt-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-(--accent)">
          Acesso ao sistema
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-(--text-primary)">Entrar no 7Commander</h2>
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
          Use sua conta Google para acessar projetos, contexto compartilhado e operacao colaborativa.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-(--border) bg-(--bg-elevated) p-5">
        <button
          type="button"
          onClick={() =>
            void (async () => {
              setError(null);
              try {
                await auth.signInWithGoogle(nextPath);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Falha ao iniciar login Google.");
              }
            })()
          }
          className="w-full rounded-xl bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-contrast)"
        >
          Entrar com Google
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-(--text-secondary)">
          Login oficial para acessar o workspace operacional e os dados sincronizados.
        </p>
        {error ? <p className="mt-3 text-center text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
