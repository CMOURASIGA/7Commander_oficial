"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  applyClientBrandSettings,
  ClientBrandSettings,
  DEFAULT_CLIENT_BRAND,
  getClientBrandSettings,
  CLIENT_BRAND_STORAGE_KEY,
} from "@/lib/brand-settings";
import { SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

export function ClientBrandConfig() {
  const [settings, setSettings] = useState<ClientBrandSettings>(DEFAULT_CLIENT_BRAND);
  const [saved, setSaved] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    const stored = getClientBrandSettings();
    setSettings(stored);
    applyClientBrandSettings(stored);
  }, []);

  function update<K extends keyof ClientBrandSettings>(key: K, value: ClientBrandSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const logoUrl = String(reader.result);
      update("logoUrl", logoUrl);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 48;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0, 48, 48);
        const colors = new Map<string, number>();
        const data = context.getImageData(0, 0, 48, 48).data;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] < 180) continue;
          const red = Math.round(data[index] / 32) * 32;
          const green = Math.round(data[index + 1] / 32) * 32;
          const blue = Math.round(data[index + 2] / 32) * 32;
          const key = `${red},${green},${blue}`;
          colors.set(key, (colors.get(key) ?? 0) + 1);
        }
        const palette = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key.split(",").map(Number));
        const hex = (color: number[]) => `#${color.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
        const primary = palette.find(([red, green, blue]) => Math.max(red, green, blue) - Math.min(red, green, blue) > 70);
        const highlight = palette.find(([red, green, blue]) => primary && hex([red, green, blue]) !== hex(primary) && Math.max(red, green, blue) - Math.min(red, green, blue) > 70);
        if (primary) update("primaryColor", hex(primary));
        if (highlight) update("highlightColor", hex(highlight));
      };
      image.src = logoUrl;
    };
    reader.readAsDataURL(file);
  }

  function save() {
    window.localStorage.setItem(CLIENT_BRAND_STORAGE_KEY, JSON.stringify(settings));
    applyClientBrandSettings(settings);
    window.dispatchEvent(new CustomEvent("client-brand-updated", { detail: settings }));
    setSaved(true);
  }

  function restoreConsultServices() {
    window.localStorage.removeItem(CLIENT_BRAND_STORAGE_KEY);
    setSettings(DEFAULT_CLIENT_BRAND);
    applyClientBrandSettings(DEFAULT_CLIENT_BRAND);
    window.dispatchEvent(new CustomEvent("client-brand-updated", { detail: DEFAULT_CLIENT_BRAND }));
    setSaved(true);
  }

  return (
    <SurfaceCard>
      <SectionLabel>White label do cliente</SectionLabel>
      <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Identidade apresentada ao cliente</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-secondary)">
        O 7Commander permanece uma plataforma Consult Services. Ao enviar uma logo, as cores predominantes são sugeridas automaticamente e podem ser ajustadas antes de salvar.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-(--border) bg-white p-4">
          <img src={settings.logoUrl} alt="Prévia da marca do cliente" className="max-h-24 max-w-full rounded-xl object-contain" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-(--text-primary)">Nome exibido<input value={settings.clientName} onChange={(event) => update("clientName", event.target.value)} className="workspace-input mt-1" /></label>
          <label className="text-sm font-medium text-(--text-primary)">
            Logo do cliente
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <span className="workspace-button-primary cursor-pointer">Escolher arquivo</span>
              <span className="text-xs font-normal text-(--text-secondary)">{selectedFileName || "Nenhum arquivo selecionado"}</span>
            </span>
            <input type="file" accept="image/*" onChange={selectLogo} className="sr-only" />
          </label>
          <label className="text-sm font-medium text-(--text-primary)">Cor principal<input type="color" value={settings.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-(--border) bg-white p-1" /></label>
          <label className="text-sm font-medium text-(--text-primary)">Cor de destaque<input type="color" value={settings.highlightColor} onChange={(event) => update("highlightColor", event.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-(--border) bg-white p-1" /></label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} className="workspace-button-primary">Salvar identidade do cliente</button>
        <button type="button" onClick={restoreConsultServices} className="workspace-button-secondary">Restaurar Consult Services</button>
        {saved ? <span className="text-sm text-(--success)">Identidade atualizada neste ambiente.</span> : null}
      </div>
    </SurfaceCard>
  );
}
