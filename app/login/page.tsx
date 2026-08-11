"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";

export default function LoginPage() {
  const auth = useKairosAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
          Use o e-mail cadastrado pela sua empresa para acessar o ambiente isolado do 7Commander.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-(--border) bg-(--bg-elevated) p-5">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void (async () => {
          setSubmitting(true); setError(null); setMessage(null);
          try { await auth.signInWithPassword(email, password); }
          catch (err) { setError(err instanceof Error ? err.message : "Falha ao entrar."); }
          finally { setSubmitting(false); }
        })(); }}>
          <label className="block text-left text-sm font-medium text-(--text-primary)">E-mail
            <input className="workspace-input mt-1" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-left text-sm font-medium text-(--text-primary)">Senha
            <input className="workspace-input mt-1" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-(--accent) px-4 py-3 text-sm font-semibold text-(--accent-contrast)">
            {submitting ? "Entrando..." : "Entrar"}
          </button>
          <button type="button" disabled={submitting} onClick={() => void (async () => {
            setSubmitting(true); setError(null); setMessage(null);
            try { await auth.signUpWithPassword(email, password); setMessage("Conta criada. Verifique seu e-mail se a confirmação estiver habilitada."); }
            catch (err) { setError(err instanceof Error ? err.message : "Falha ao criar conta."); }
            finally { setSubmitting(false); }
          })()} className="w-full rounded-xl border border-(--border) px-4 py-3 text-sm font-semibold text-(--text-primary)">Criar primeiro acesso</button>
        </form>
        <p className="mt-3 text-center text-xs leading-5 text-(--text-secondary)">
          Use o mesmo e-mail que recebeu o convite do administrador da empresa.
        </p>
        {message ? <p className="mt-3 text-center text-sm text-(--success)">{message}</p> : null}
        {error ? <p className="mt-3 text-center text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
