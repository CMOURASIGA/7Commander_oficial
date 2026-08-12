export type ClientBrandSettings = {
  clientName: string;
  logoUrl: string;
  primaryColor: string;
  highlightColor: string;
  sidebarColor?: string;
  softColor?: string;
  contrastColor?: string;
};

export const CLIENT_BRAND_STORAGE_KEY = "7commander-client-brand";

export const DEFAULT_CLIENT_BRAND: ClientBrandSettings = {
  clientName: "Consult Services Tecnologia",
  logoUrl: "https://i.imgur.com/gxXnYsA.png",
  primaryColor: "#003B73",
  highlightColor: "#00AEEF",
  sidebarColor: "#003B73",
  softColor: "#E1F4FC",
  contrastColor: "#FFFFFF",
};

function normalizeHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

function rgb(color: string) {
  const value = normalizeHex(color, "#003B73").slice(1);
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
}

function hex(values: number[]) {
  return `#${values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function mix(color: string, target: string, amount: number) {
  const sourceRgb = rgb(color);
  const targetRgb = rgb(target);
  return hex(sourceRgb.map((value, index) => value + (targetRgb[index] - value) * amount));
}

export function deriveBrandPalette(primaryColor: string, highlightColor: string) {
  const primary = normalizeHex(primaryColor, DEFAULT_CLIENT_BRAND.primaryColor);
  const highlight = normalizeHex(highlightColor, primary);
  const [red, green, blue] = rgb(primary);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return {
    primaryColor: primary,
    highlightColor: highlight,
    sidebarColor: mix(primary, "#111827", luminance > 0.45 ? 0.68 : 0.38),
    softColor: mix(primary, "#FFFFFF", 0.9),
    contrastColor: luminance > 0.58 ? "#172033" : "#FFFFFF",
  };
}

export function completeClientBrand(settings: ClientBrandSettings): ClientBrandSettings {
  const palette = deriveBrandPalette(settings.primaryColor, settings.highlightColor);
  return { ...settings, ...palette, sidebarColor: settings.sidebarColor || palette.sidebarColor, softColor: settings.softColor || palette.softColor, contrastColor: settings.contrastColor || palette.contrastColor };
}

export function getClientBrandSettings(): ClientBrandSettings {
  if (typeof window === "undefined") return DEFAULT_CLIENT_BRAND;
  try {
    const stored = window.localStorage.getItem(CLIENT_BRAND_STORAGE_KEY);
    return completeClientBrand(stored ? { ...DEFAULT_CLIENT_BRAND, ...JSON.parse(stored) } : DEFAULT_CLIENT_BRAND);
  } catch {
    return DEFAULT_CLIENT_BRAND;
  }
}

export function applyClientBrandSettings(settings: ClientBrandSettings) {
  if (typeof document === "undefined") return;
  const complete = completeClientBrand(settings);
  const root = document.documentElement.style;
  root.setProperty("--accent", complete.primaryColor);
  root.setProperty("--accent-strong", complete.sidebarColor!);
  root.setProperty("--accent-soft", complete.softColor!);
  root.setProperty("--accent-ghost", mix(complete.primaryColor, "#FFFFFF", 0.96));
  root.setProperty("--accent-contrast", complete.contrastColor!);
  root.setProperty("--brand-ink", complete.primaryColor);
  root.setProperty("--sidebar", complete.sidebarColor!);
  root.setProperty("--sidebar-deep", complete.sidebarColor!);
  root.setProperty("--brand-highlight", complete.highlightColor);
  root.setProperty("--bg-elevated", complete.softColor!);
  root.setProperty("--border-strong", mix(complete.primaryColor, "#FFFFFF", 0.55));
}

export function resetClientBrandSettings() {
  if (typeof window !== "undefined") window.localStorage.removeItem(CLIENT_BRAND_STORAGE_KEY);
  applyClientBrandSettings(DEFAULT_CLIENT_BRAND);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("client-brand-updated"));
}
