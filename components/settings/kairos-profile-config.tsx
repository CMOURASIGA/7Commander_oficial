"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

type KairosProfile = {
  instructions: string;
  knowledge: string;
  icebreakers: string[];
};

const EMPTY_PROFILE: KairosProfile = {
  instructions: "",
  knowledge: "",
  icebreakers: [],
};

export function KairosProfileConfig() {
  const [profile, setProfile] = useState<KairosProfile>(EMPTY_PROFILE);
  const [icebreakersText, setIcebreakersText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/kairos/profile", { headers: getClientAuthHeaders() });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Falha ao carregar configuracao.");
        const data = (payload?.data ?? EMPTY_PROFILE) as KairosProfile;
        setProfile(data);
        setIcebreakersText((data.icebreakers ?? []).join("\n"));
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha ao carregar configuracao.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setStatus(null);
    try {
      const icebreakers = icebreakersText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const response = await fetch("/api/kairos/profile", {
        method: "PUT",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...profile, icebreakers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao salvar configuracao.");
      const saved = payload.data as KairosProfile;
      setProfile(saved);
      setIcebreakersText(saved.icebreakers.join("\n"));
      setStatus("Configuracao do Kairos salva. Novas conversas ja usarao estas orientacoes.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao salvar configuracao.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SurfaceCard>
      <SectionLabel>Kairos personalizado</SectionLabel>
      <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Como o Kairos deve trabalhar</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-secondary)">
        Defina orientacoes, conhecimento complementar e mensagens iniciais. Campos vazios mantem o comportamento padrao do Kairos.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-(--text-secondary)">Carregando configuracao do Kairos...</p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-(--text-primary)">
            Instrucoes de trabalho
            <span className="mt-1 block text-xs font-normal text-(--text-secondary)">Defina tom, prioridades, regras e como o Kairos deve responder.</span>
            <textarea
              value={profile.instructions}
              onChange={(event) => setProfile((current) => ({ ...current, instructions: event.target.value }))}
              placeholder="Ex.: Atue como gerente de projetos. Antes de recomendar uma acao, informe impacto, responsavel e proximo passo."
              className="workspace-input mt-2 min-h-36 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-(--text-primary)">
            Conhecimento adicional
            <span className="mt-1 block text-xs font-normal text-(--text-secondary)">Inclua regras da empresa, processos, siglas ou informacoes que devem orientar todas as conversas.</span>
            <textarea
              value={profile.knowledge}
              onChange={(event) => setProfile((current) => ({ ...current, knowledge: event.target.value }))}
              placeholder="Ex.: SLA de atendimento: 4 horas. Projetos de manutencao usam as etapas levantamento, planejamento, execucao e homologacao."
              className="workspace-input mt-2 min-h-36 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-(--text-primary)">
            Quebra-gelos do chat
            <span className="mt-1 block text-xs font-normal text-(--text-secondary)">Uma sugestao por linha. Elas aparecem para iniciar uma conversa e podem ser ajustadas antes do envio.</span>
            <textarea
              value={icebreakersText}
              onChange={(event) => setIcebreakersText(event.target.value)}
              placeholder={"Quais sao os principais riscos deste projeto?\nCrie um plano de acao para esta semana.\nResuma o status atual para a diretoria."}
              className="workspace-input mt-2 min-h-28 w-full"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void saveProfile()} disabled={saving} className="workspace-button-primary">
              {saving ? "Salvando..." : "Salvar configuracao do Kairos"}
            </button>
            {status ? <p className="text-sm text-(--text-secondary)">{status}</p> : null}
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
