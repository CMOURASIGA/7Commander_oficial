"use client";

const STORAGE_ACCESS_TOKEN = "kairos_access_token";
const STORAGE_AUTH_EMAIL = "kairos_auth_email";

function getLocalStorageValue(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key)?.trim() ?? "";
}

export function getClientAuthHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra ?? {});

  if (typeof window === "undefined") return headers;
  const accessToken = getLocalStorageValue(STORAGE_ACCESS_TOKEN);

  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export function setClientAuthToken(accessToken: string, email?: string | null) {
  if (typeof window === "undefined") return;
  const normalized = accessToken.trim();
  if (normalized) {
    window.localStorage.setItem(STORAGE_ACCESS_TOKEN, normalized);
  } else {
    window.localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (normalizedEmail) {
    window.localStorage.setItem(STORAGE_AUTH_EMAIL, normalizedEmail);
  } else {
    window.localStorage.removeItem(STORAGE_AUTH_EMAIL);
  }
}

export function clearClientAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  window.localStorage.removeItem(STORAGE_AUTH_EMAIL);
}

export function getClientAuthEmail(): string | null {
  const value = getLocalStorageValue(STORAGE_AUTH_EMAIL);
  return value || null;
}
