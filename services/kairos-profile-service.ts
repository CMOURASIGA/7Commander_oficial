import { getSupabaseServerClient } from "@/lib/supabase/server";

const ALLOW_LOCAL_FALLBACK = process.env.KAIROS_ENABLE_LOCAL_FALLBACK === "true";
const localProfiles = new Map<string, KairosProfileConfig>();

export type KairosProfileConfig = {
  instructions: string;
  knowledge: string;
  icebreakers: string[];
};

export const DEFAULT_KAIROS_PROFILE: KairosProfileConfig = {
  instructions: "",
  knowledge: "",
  icebreakers: [],
};

function normalizeText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeIcebreakers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item, 240))
    .filter(Boolean)
    .slice(0, 8);
}

export function normalizeKairosProfile(input: Partial<KairosProfileConfig>): KairosProfileConfig {
  return {
    instructions: normalizeText(input.instructions, 12000),
    knowledge: normalizeText(input.knowledge, 24000),
    icebreakers: normalizeIcebreakers(input.icebreakers),
  };
}

export async function getKairosProfile(userId: string): Promise<KairosProfileConfig> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const result = await supabase
        .from("kairos_profiles")
        .select("instructions, knowledge, icebreakers")
        .eq("user_id", userId)
        .maybeSingle();
      if (!result.error && result.data) return normalizeKairosProfile(result.data);
    } catch {
      // Use the default profile when the optional schema is not available yet.
    }
  }

  return localProfiles.get(userId) ?? DEFAULT_KAIROS_PROFILE;
}

export async function saveKairosProfile(
  userId: string,
  input: Partial<KairosProfileConfig>,
): Promise<KairosProfileConfig> {
  const profile = normalizeKairosProfile(input);
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const result = await supabase
      .from("kairos_profiles")
      .upsert(
        {
          user_id: userId,
          instructions: profile.instructions,
          knowledge: profile.knowledge,
          icebreakers: profile.icebreakers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("instructions, knowledge, icebreakers")
      .single();
    if (!result.error && result.data) return normalizeKairosProfile(result.data);
    if (!ALLOW_LOCAL_FALLBACK) throw new Error(result.error?.message || "Falha ao salvar configuracao do Kairos.");
  }

  localProfiles.set(userId, profile);
  return profile;
}
