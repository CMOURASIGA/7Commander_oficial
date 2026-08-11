export type ClientBrandSettings = {
  clientName: string;
  logoUrl: string;
  primaryColor: string;
  highlightColor: string;
};

export const CLIENT_BRAND_STORAGE_KEY = "7commander-client-brand";

export const DEFAULT_CLIENT_BRAND: ClientBrandSettings = {
  clientName: "Consult Services Tecnologia",
  logoUrl: "https://i.imgur.com/gxXnYsA.png",
  primaryColor: "#003B73",
  highlightColor: "#00AEEF",
};

export function getClientBrandSettings(): ClientBrandSettings {
  if (typeof window === "undefined") return DEFAULT_CLIENT_BRAND;
  try {
    const stored = window.localStorage.getItem(CLIENT_BRAND_STORAGE_KEY);
    return stored ? { ...DEFAULT_CLIENT_BRAND, ...JSON.parse(stored) } : DEFAULT_CLIENT_BRAND;
  } catch {
    return DEFAULT_CLIENT_BRAND;
  }
}

export function applyClientBrandSettings(settings: ClientBrandSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  root.setProperty("--accent", settings.primaryColor);
  root.setProperty("--accent-strong", settings.primaryColor);
  root.setProperty("--brand-ink", settings.primaryColor);
  root.setProperty("--sidebar", settings.primaryColor);
  root.setProperty("--sidebar-deep", settings.primaryColor);
  root.setProperty("--brand-highlight", settings.highlightColor);
}
