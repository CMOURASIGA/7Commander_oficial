"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { resetClientBrandSettings } from "@/lib/brand-settings";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => resetClientBrandSettings(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const client = getSupabaseBrowserClient();
    if (!client) { setError("Serviço de autenticação indisponível."); setBusy(false); return; }
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/account/change-password");
    const result = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirectTo.toString() });
    if (result.error) setError(result.error.message);
    else setMessage("Enviamos as instruções para o e-mail informado.");
    setBusy(false);
  }

  return <section className="mx-auto w-full max-w-lg rounded-[1.8rem] border border-(--border) bg-white p-6 shadow-[var(--shadow-card)] md:p-8"><div className="flex justify-center"><BrandLockup align="center" size="md" /></div><div className="mt-5 text-center"><p className="text-[10px] font-black uppercase tracking-[.24em] text-(--accent)">Recuperação de acesso</p><h1 className="mt-2 text-2xl font-semibold">Redefinir senha</h1><p className="mt-2 text-sm text-(--text-secondary)">Informe seu e-mail para receber o link de recuperação.</p></div><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">E-mail<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="workspace-input mt-1" /></label>{message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<button disabled={busy} className="w-full rounded-xl bg-(--accent) px-4 py-3 text-sm font-semibold text-white">{busy ? "Enviando..." : "Enviar link"}</button><Link href="/login" className="block text-center text-sm font-semibold text-(--accent)">Voltar para o login</Link></form></section>;
}
