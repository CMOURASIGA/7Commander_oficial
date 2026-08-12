import type { OrganizationRole } from "@/lib/organization-context";

export type WorkspaceCapability = "manage_company" | "manage_users" | "manage_work" | "run_daily" | "view_work";

const ROLE_CAPABILITIES: Record<OrganizationRole, ReadonlySet<WorkspaceCapability>> = {
  owner: new Set(["manage_company", "manage_users", "manage_work", "run_daily", "view_work"]),
  admin: new Set(["manage_company", "manage_users", "manage_work", "run_daily", "view_work"]),
  manager: new Set(["manage_work", "run_daily", "view_work"]),
  member: new Set(["view_work"]),
};

export function hasCapability(role: OrganizationRole, capability: WorkspaceCapability) {
  return ROLE_CAPABILITIES[role]?.has(capability) ?? false;
}

export function canAccessWorkspacePath(role: OrganizationRole, pathname: string) {
  if (pathname.startsWith("/settings")) return hasCapability(role, "manage_company");
  if (pathname.startsWith("/daily")) return hasCapability(role, "run_daily");
  return hasCapability(role, "view_work");
}

const PATH_MODULES: Array<[string, string]> = [
  ["/voice", "voice"], ["/chat", "kairos"], ["/daily", "daily"], ["/clients", "clients"],
  ["/projects", "projects"], ["/activities", "activities"], ["/memory", "memory"],
];

export function isWorkspaceModuleEnabled(pathname: string, enabledModules: string[]) {
  const mapping = PATH_MODULES.find(([prefix]) => pathname.startsWith(prefix));
  return !mapping || enabledModules.includes(mapping[1]);
}

const READ_ONLY_OPERATIONAL_PREFIXES = [
  "/api/clients", "/api/projects", "/api/risks", "/api/decisions",
  "/api/knowledge", "/api/memories", "/api/kairos/profile",
];

export function canAccessApi(role: OrganizationRole, pathname: string, method: string) {
  if (pathname.startsWith("/api/daily") || pathname.startsWith("/api/task-daily")) {
    return hasCapability(role, "run_daily");
  }
  if (pathname.startsWith("/api/organization/members")) {
    return method === "GET" || hasCapability(role, "manage_users");
  }
  if (READ_ONLY_OPERATIONAL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (method === "GET") return hasCapability(role, "view_work");
    return hasCapability(role, "manage_work");
  }
  return hasCapability(role, "view_work");
}

const API_MODULES: Array<[string, string]> = [
  ["/api/voice", "voice"], ["/api/chat", "kairos"], ["/api/kairos", "kairos"],
  ["/api/daily", "daily"], ["/api/clients", "clients"], ["/api/projects", "projects"],
  ["/api/tasks", "activities"], ["/api/risks", "projects"], ["/api/decisions", "projects"],
  ["/api/memories", "memory"], ["/api/knowledge", "knowledge"],
];

export function requiredModuleForApi(pathname: string) {
  return API_MODULES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
}

export const ROLE_EXPLANATIONS: Record<OrganizationRole, string> = {
  owner: "Controle principal, usuários, configurações e operação.",
  admin: "Gerencia usuários, configurações e toda a operação.",
  manager: "Conduz Daily e gerencia a operação, sem configurações da empresa.",
  member: "Consulta e atua apenas no que estiver vinculado, sem Daily ou configurações.",
};
