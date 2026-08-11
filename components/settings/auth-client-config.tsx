"use client";

import { useEffect, useState } from "react";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthEmail } from "@/lib/client-auth";

const STORAGE_API_KEY = "kairos_api_key";
const STORAGE_USER_ID = "kairos_user_id";

export function AuthClientConfig() {
  const auth = useKairosAuth();
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(window.localStorage.getItem(STORAGE_API_KEY) ?? "");
    setUserId(window.localStorage.getItem(STORAGE_USER_ID) ?? "");
    setAuthEmail(getClientAuthEmail());
  }, []);

  function handleSave() {
    window.localStorage.setItem(STORAGE_API_KEY, apiKey.trim());
    window.localStorage.setItem(STORAGE_USER_ID, userId.trim());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <article className="workspace-card p-4">
      <p className="workspace-section-label">Autenticação do navegador</p>
      <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Acesso do operador</h3>
      {auth.required ? (
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
          Modo principal: login Google com sessao Supabase.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
          Use este bloco quando `KAIROS_API_KEY` estiver habilitada no backend do 7Commander.
        </p>
      )}

      <div className="workspace-card-muted mt-4 p-3 text-xs text-(--text-secondary)">
        <p>
          Sessao Google:{" "}
          {auth.loading ? "carregando..." : auth.user?.email ? `ativa (${auth.user.email})` : "nao autenticada"}
        </p>
        {authEmail ? <p className="mt-1">Email salvo no cliente: {authEmail}</p> : null}
        {!auth.user ? (
          <button
            type="button"
            onClick={() => void auth.signInWithGoogle()}
            className="workspace-button-primary mt-3"
          >
            Entrar com Google
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void auth.signOut()}
            className="workspace-button-secondary mt-3"
          >
            Encerrar sessao
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="KAIROS_API_KEY"
          className="workspace-input"
        />
        <input
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="UUID do usuario (x-kairos-user-id)"
          className="workspace-input"
        />
        <button
          type="button"
          onClick={handleSave}
          className="workspace-button-primary"
        >
          Salvar no navegador
        </button>
        {saved ? <p className="text-xs text-(--success)">Credenciais locais salvas.</p> : null}
      </div>
    </article>
  );
}
