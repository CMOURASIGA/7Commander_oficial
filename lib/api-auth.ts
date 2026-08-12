import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, isAuthRequired } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveOrganizationContext, type OrganizationRole } from "@/lib/organization-context";
import { canAccessApi, requiredModuleForApi } from "@/lib/access-control";

const AUTHORIZATION_HEADER = "authorization";

function normalizeHeaderValue(value: string | null): string {
  return value?.trim() ?? "";
}

function extractBearerToken(request: NextRequest): string {
  const authorization = normalizeHeaderValue(request.headers.get(AUTHORIZATION_HEADER));
  if (!authorization) return "";

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token) return "";
  if (scheme.toLowerCase() !== "bearer") return "";
  return token.trim();
}

function seemsJwtToken(value: string): boolean {
  return value.split(".").length === 3;
}

export type AuthenticatedRequestContext = {
  userId: string;
  userEmail: string | null;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;
  authMode: "supabase";
};

export async function requireApiAuth(request: NextRequest): Promise<{
  ok: true;
  context: AuthenticatedRequestContext;
} | {
  ok: false;
  response: NextResponse;
}> {
  const configuredApiKey = normalizeHeaderValue(process.env.KAIROS_API_KEY ?? "");
  const bearerToken = extractBearerToken(request);
  const authRequired = isAuthRequired();

  if (bearerToken && seemsJwtToken(bearerToken) && bearerToken !== configuredApiKey) {
    const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
    if (NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const authClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      const userResult = await authClient.auth.getUser(bearerToken);

      if (userResult.data.user && !userResult.error) {
        const serverClient = getSupabaseServerClient();
        if (!serverClient) {
          return {
            ok: false,
            response: NextResponse.json({ error: "Supabase nao configurado no servidor." }, { status: 503 }),
          };
        }
        const organization = await resolveOrganizationContext(
          serverClient,
          userResult.data.user.id,
          userResult.data.user.email ?? null,
        );
        if (!organization) {
          return {
            ok: false,
            response: NextResponse.json({ error: "Empresa do usuario nao encontrada." }, { status: 403 }),
          };
        }
        if (!canAccessApi(organization.role, request.nextUrl.pathname, request.method)) {
          return {
            ok: false,
            response: NextResponse.json({ error: "Seu perfil nao possui permissao para realizar esta acao." }, { status: 403 }),
          };
        }
        const requiredModule = requiredModuleForApi(request.nextUrl.pathname);
        if (requiredModule) {
          const moduleAccess = await serverClient.from("organization_modules").select("enabled")
            .eq("organization_id", organization.organizationId).eq("module_key", requiredModule).maybeSingle();
          if (!moduleAccess.data?.enabled) {
            return {
              ok: false,
              response: NextResponse.json({ error: "Este modulo nao esta liberado no contrato da empresa." }, { status: 403 }),
            };
          }
        }
        return {
          ok: true,
          context: {
            userId: userResult.data.user.id,
            userEmail: userResult.data.user.email ?? null,
            organizationId: organization.organizationId,
            organizationName: organization.organizationName,
            organizationRole: organization.role,
            authMode: "supabase",
          },
        };
      }
    }
  }

  if (authRequired) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Nao autenticado. Entre com Google para continuar.",
        },
        { status: 401 },
      ),
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Autenticacao Supabase obrigatoria." }, { status: 401 }),
  };
}
