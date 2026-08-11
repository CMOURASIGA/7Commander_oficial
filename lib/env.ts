type PublicEnv = {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

type ServerEnv = PublicEnv & {
  OPENAI_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  KAIROS_AUTH_REQUIRED: string;
};

export const PUBLIC_ENV_KEYS: Array<keyof PublicEnv> = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

export const SERVER_ENV_KEYS: Array<keyof ServerEnv> = [
  ...PUBLIC_ENV_KEYS,
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function getEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getPublicEnv(): PublicEnv {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  };
}

export function getServerEnv(): ServerEnv {
  const env: ServerEnv = {
    ...getPublicEnv(),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    KAIROS_AUTH_REQUIRED: process.env.KAIROS_AUTH_REQUIRED?.trim() ?? "",
  };
  return env;
}

export function isAuthRequired(): boolean {
  const value = getEnvValue("KAIROS_AUTH_REQUIRED").toLowerCase();
  if (!value) return true;
  return value !== "false";
}

export function validatePublicEnv(): string[] {
  const env = getPublicEnv();
  return PUBLIC_ENV_KEYS.filter((key) => !env[key]);
}

export function validateServerEnv(): string[] {
  const env = getServerEnv();
  return SERVER_ENV_KEYS.filter((key) => !env[key]);
}
