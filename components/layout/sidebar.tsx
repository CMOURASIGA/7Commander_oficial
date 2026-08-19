"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_LOGO_URL, BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { DEFAULT_CLIENT_BRAND, ClientBrandSettings } from "@/lib/brand-settings";
import { canAccessWorkspacePath } from "@/lib/access-control";
import type { OrganizationRole } from "@/lib/organization-context";

// Voice Room e Dashboard Kairos nao aparecem mais aqui: o Kairos e o "plus"
// de IA do 7Commander, acessivel de qualquer tela pelo botao flutuante (que
// respeita o mesmo licenciamento por modulo "kairos"/"voice"), nao um
// modulo de gestao com o mesmo peso de Projetos/Atividades.
const NAV_ITEMS = [
  { section: "Principal", href: "/", label: "Inicio", module: "", icon: "home" as const },
  { section: "Principal", href: "/daily", label: "Daily", module: "daily", icon: "daily" as const },
  { section: "Dados", href: "/clients", label: "Clientes", module: "clients", icon: "clients" as const },
  { section: "Dados", href: "/projects", label: "Projetos", module: "projects", icon: "projects" as const },
  { section: "Dados", href: "/activities", label: "Atividades", module: "activities", icon: "activities" as const },
  { section: "Dados", href: "/memory", label: "Memoria", module: "memory", icon: "memory" as const },
  { section: "Sistema", href: "/help", label: "Ajuda", module: "", icon: "help" as const },
  { section: "Sistema", href: "/settings", label: "Configuracoes", module: "", icon: "settings" as const },
];

type IconName = (typeof NAV_ITEMS)[number]["icon"];

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />,
  daily: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 3.5v3M16 3.5v3" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 6" />
      <path d="M15 14.2c2.9.4 4.9 2.4 5.5 5.8" />
    </>
  ),
  projects: <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />,
  activities: (
    <>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="m3 6 1 1 2-2" />
      <path d="m3 12 1 1 2-2" />
      <path d="m3 18 1 1 2-2" />
    </>
  ),
  memory: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.4.9-1.4 2v.3" />
      <path d="M12 17h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10c.4.3.9.5 1.6.5H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1Z" />
    </>
  ),
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const ROLE_LABELS: Record<OrganizationRole, string> = { owner: "Responsável", admin: "Administrador", manager: "Gestor", member: "Usuário" };

type SidebarProps = {
  clientBrand?: ClientBrandSettings;
  enabledModules?: string[];
  role?: OrganizationRole;
  /** Estado da gaveta em telas < md (celular). Ignorado em telas maiores. */
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({
  clientBrand = DEFAULT_CLIENT_BRAND,
  enabledModules = [],
  role = "member",
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => (!item.module || enabledModules.includes(item.module)) && canAccessWorkspacePath(role, item.href));
  const sections = Array.from(new Set(visibleItems.map((item) => item.section)));
  const isConsultServicesBrand = clientBrand.logoUrl === DEFAULT_CLIENT_BRAND.logoUrl;

  return (
    <>
      {isMobileOpen ? (
        <button type="button" aria-label="Fechar menu" className="sidebar-backdrop" onClick={onCloseMobile} />
      ) : null}
      <aside
        className={[
          "sidebar-shell overflow-y-auto border-white/15 md:min-h-screen md:self-stretch md:border-r",
          isMobileOpen ? "is-open" : "",
        ].join(" ")}
      >
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_95%_15%,rgba(0,174,239,0.28),transparent_2px),linear-gradient(135deg,transparent_0%,transparent_64%,rgba(0,174,239,0.18)_64%,transparent_65%)] opacity-70" />
        <div className="sidebar-brand-panel relative">
          <div className={`sidebar-brand-logo-frame${isConsultServicesBrand ? " sidebar-brand-logo-frame-consult" : ""}`}>
            <img
              src={clientBrand.logoUrl || BRAND_LOGO_URL}
              alt={clientBrand.clientName || "Consult Services Tecnologia"}
              className={`sidebar-brand-logo${isConsultServicesBrand ? " sidebar-brand-logo-consult" : ""}`}
            />
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="sidebar-close sidebar-rail-only absolute right-3 top-3 md:hidden"
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>
        <div className="sidebar-product sidebar-rail-only relative">
          <p className="sidebar-product-name">{BRAND_NAME}</p>
          <p className="sidebar-product-subtitle">{BRAND_SUBTITLE}</p>
          <p className="sidebar-product-owner">Uma plataforma Consult Services Tecnologia</p>
          <p className="mt-3 w-fit rounded-full border border-white/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90">Perfil: {ROLE_LABELS[role]}</p>
        </div>

        <nav className="relative mt-5 flex flex-col gap-5 px-3 pb-5">
          {sections.map((section) => (
            <div key={section}>
              <p className="sidebar-section-label sidebar-rail-only mb-2 px-2">{section}</p>
              <div className="flex flex-col gap-2">
                {visibleItems.filter((item) => item.section === section).map((item) => {
                  const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-[9px] text-sm font-medium transition-colors md:justify-center lg:justify-start",
                        isActive ? "sidebar-nav-link-active shadow-sm" : "",
                      ].join(" ")}
                    >
                      <NavIcon name={item.icon} />
                      <span className="sidebar-rail-only">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
