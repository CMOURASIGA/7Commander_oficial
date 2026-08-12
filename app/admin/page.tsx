"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { deriveBrandPalette } from "@/lib/brand-settings";

const MODULES = [
  ["projects", "Projetos"], ["daily", "Daily"], ["kairos", "Kairos"], ["voice", "Voice Room"],
  ["knowledge", "Conhecimento"], ["clients", "Clientes operacionais"], ["activities", "Atividades"], ["memory", "Memória"],
] as const;

type LicensedCompany = {
  id: string; name: string; legal_name?: string; tax_id?: string; status: string; plan: string;
  email?: string; phone?: string; contract_start?: string; contract_end?: string;
  billing_day?: number; licensed_users: number;
  address?: { street?: string; number?: string; city?: string; state?: string; zipCode?: string };
  contract_contact?: { name?: string; email?: string; phone?: string };
  organization_members?: Array<{ id: string; user_id?: string; role?: string; status?: string }>;
  organization_modules?: Array<{ module_key: string; enabled: boolean }>;
  branding?: { displayName?: string; logoUrl?: string; primaryColor?: string; secondaryColor?: string; sidebarColor?: string; softColor?: string; contrastColor?: string };
  quotas?: { lifecycle?: { inactiveAt?: string; retentionUntil?: string; inactiveReason?: string; inactiveBy?: string; reactivatedAt?: string; reactivatedBy?: string } };
};

type CompanyUser = { id: string; user_id: string; name: string; email: string; role: string; status: string; created_at: string };
type AuditEvent = { id: string; action: string; entity_type: string; details?: Record<string, unknown>; created_at: string };
type AdminTab = "new" | "companies" | "details" | "users" | "history";

export default function PlatformAdminPage() {
  const auth = useKairosAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<LicensedCompany[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("companies");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [brandDisplayName, setBrandDisplayName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#003B73");
  const [secondaryColor, setSecondaryColor] = useState("#00AEEF");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editBrandName, setEditBrandName] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#003B73");
  const [editSecondaryColor, setEditSecondaryColor] = useState("#00AEEF");
  const selectedCompany = companies.find((company) => company.id === selected);
  const palette = useMemo(() => deriveBrandPalette(primaryColor, secondaryColor), [primaryColor, secondaryColor]);
  const filteredCompanies = useMemo(() => { const query = search.trim().toLowerCase(); return query ? companies.filter((company) => [company.name, company.legal_name, company.tax_id, company.email, company.contract_contact?.name].some((value) => String(value || "").toLowerCase().includes(query))) : companies; }, [companies, search]);

  async function load() {
    setLoading(true); setError("");
    const response = await fetch("/api/platform/clients", { headers: getClientAuthHeaders() });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível carregar as empresas licenciadas.");
    else {
      setCompanies(result.clients || []);
      setSelected((current) => current || result.clients?.[0]?.id || "");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function loadCompanyWorkspace(companyId: string, target: AdminTab = "details") {
    setSelected(companyId); setTab(target); setError("");
    const [usersResponse, eventsResponse] = await Promise.all([
      fetch(`/api/platform/users?organizationId=${encodeURIComponent(companyId)}`, { headers: getClientAuthHeaders() }),
      fetch(`/api/platform/audit?organizationId=${encodeURIComponent(companyId)}`, { headers: getClientAuthHeaders() }),
    ]);
    const usersResult = await usersResponse.json(); const eventsResult = await eventsResponse.json();
    if (usersResponse.ok) setUsers(usersResult.users || []); else setError(usersResult.error || "Não foi possível carregar os usuários.");
    if (eventsResponse.ok) setEvents(eventsResult.events || []);
  }

  async function uploadLogo(file: File, organizationId?: string) {
    const body = new FormData(); body.append("file", file); if (organizationId) body.append("organizationId", organizationId);
    const response = await fetch("/api/platform/branding/logo", { method: "POST", headers: getClientAuthHeaders(), body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível armazenar a logo.");
    return String(result.url);
  }

  function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem para a logo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A logo deve ter no máximo 2 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setLogoFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const nextLogoUrl = String(reader.result);
      setLogoUrl(nextLogoUrl);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 48;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0, 48, 48);
        const colors = new Map<string, number>();
        const pixels = context.getImageData(0, 0, 48, 48).data;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index + 3] < 180) continue;
          const red = Math.min(255, Math.round(pixels[index] / 32) * 32);
          const green = Math.min(255, Math.round(pixels[index + 1] / 32) * 32);
          const blue = Math.min(255, Math.round(pixels[index + 2] / 32) * 32);
          const key = `${red},${green},${blue}`;
          colors.set(key, (colors.get(key) ?? 0) + 1);
        }
        const palette = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key.split(",").map(Number));
        const toHex = (color: number[]) => `#${color.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
        const saturated = palette.filter(([red, green, blue]) => Math.max(red, green, blue) - Math.min(red, green, blue) > 70);
        if (saturated[0]) {
          const dominant = toHex(saturated[0]);
          setPrimaryColor(dominant);
          setSecondaryColor(saturated[1] ? toHex(saturated[1]) : dominant);
        }
      };
      image.src = nextLogoUrl;
    };
    reader.readAsDataURL(file);
    void uploadLogo(file).then(setLogoUrl).catch((uploadError) => setError(uploadError instanceof Error ? uploadError.message : "Falha no envio da logo."));
  }

  function removeLogo() {
    setLogoUrl("");
    setLogoFileName("");
  }

  function openEditor(company: LicensedCompany) {
    setEditLogoUrl(company.branding?.logoUrl || "");
    setEditBrandName(company.branding?.displayName || company.name);
    setEditPrimaryColor(company.branding?.primaryColor || "#003B73");
    setEditSecondaryColor(company.branding?.secondaryColor || "#00AEEF");
    setEditOpen(true);
  }

  function selectEditLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) { setError("Selecione uma imagem de até 2 MB."); return; }
    void uploadLogo(file, selectedCompany?.id).then(setEditLogoUrl).catch((uploadError) => setError(uploadError instanceof Error ? uploadError.message : "Falha no envio da logo."));
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const modules = MODULES.filter(([key]) => data.get(`module-${key}`) === "on").map(([key]) => key);
    const payload = {
      name: data.get("name"), legalName: data.get("legalName"), taxId: data.get("taxId"),
      email: data.get("email"), phone: data.get("phone"), plan: data.get("plan"), status: data.get("status"),
      contractStart: data.get("contractStart"), contractEnd: data.get("contractEnd"),
      billingDay: data.get("billingDay"), licensedUsers: data.get("licensedUsers"),
      address: { street: data.get("street"), number: data.get("number"), city: data.get("city"), state: data.get("state"), zipCode: data.get("zipCode") },
      contractContact: { name: data.get("contactName"), email: data.get("contactEmail"), phone: data.get("contactPhone") },
      branding: { displayName: brandDisplayName || data.get("name"), logoUrl, primaryColor, secondaryColor, sidebarColor: palette.sidebarColor, softColor: palette.softColor, contrastColor: palette.contrastColor },
      modules,
    };
    const response = await fetch("/api/platform/clients", { method: "POST", headers: getClientAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível cadastrar a empresa.");
    else { setMessage("Empresa licenciada cadastrada com sucesso."); form.reset(); removeLogo(); setBrandDisplayName(""); setPrimaryColor("#003B73"); setSecondaryColor("#00AEEF"); await load(); }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/platform/users", { method: "POST", headers: getClientAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ organizationId: selected, name: data.get("name"), email: data.get("email"), temporaryPassword: data.get("password"), role: data.get("role") }) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível cadastrar o usuário.");
    else { setMessage(result.existingUser ? "Usuário existente vinculado à empresa com sucesso." : "Usuário criado. O e-mail de confirmação foi enviado."); form.reset(); await load(); await loadCompanyWorkspace(selected, "users"); }
  }

  async function updateUser(user: CompanyUser, changes: Partial<CompanyUser>) {
    setError(""); setMessage("");
    const response = await fetch(`/api/platform/users/${user.id}`, { method: "PATCH", headers: getClientAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ ...user, ...changes }) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível atualizar o usuário.");
    else { setMessage("Usuário atualizado com sucesso."); await loadCompanyWorkspace(selected, "users"); }
  }

  async function updateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompany) return;
    setError(""); setMessage("");
    const data = new FormData(event.currentTarget);
    const status = String(data.get("status"));
    const inactiveReason = String(data.get("inactiveReason") ?? "").trim();
    if (status === "suspended" && selectedCompany.status !== "suspended" && !inactiveReason) { setError("Informe o motivo da inativação."); return; }
    if (status === "suspended" && selectedCompany.status !== "suspended" && !window.confirm("Confirmar a inativação? Os usuários perderão o acesso, mas todos os dados serão preservados por cinco anos.")) return;
    const modules = MODULES.filter(([key]) => data.get(`edit-module-${key}`) === "on").map(([key]) => key);
    const editPalette = deriveBrandPalette(editPrimaryColor, editSecondaryColor);
    const payload = {
      name: data.get("name"), legalName: data.get("legalName"), taxId: data.get("taxId"), email: data.get("email"), phone: data.get("phone"), plan: data.get("plan"), status,
      contractStart: data.get("contractStart"), contractEnd: data.get("contractEnd"), billingDay: data.get("billingDay"), licensedUsers: data.get("licensedUsers"), inactiveReason,
      address: { street: data.get("street"), number: data.get("number"), city: data.get("city"), state: data.get("state"), zipCode: data.get("zipCode") },
      contractContact: { name: data.get("contactName"), email: data.get("contactEmail"), phone: data.get("contactPhone") }, branding: { displayName: editBrandName || data.get("name"), logoUrl: editLogoUrl, primaryColor: editPrimaryColor, secondaryColor: editSecondaryColor, sidebarColor: editPalette.sidebarColor, softColor: editPalette.softColor, contrastColor: editPalette.contrastColor }, modules,
    };
    const response = await fetch(`/api/platform/clients/${selectedCompany.id}`, { method: "PATCH", headers: getClientAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível atualizar a empresa.");
    else { setMessage(status === "suspended" ? "Empresa inativada. O acesso foi bloqueado e a retenção iniciada." : "Empresa licenciada atualizada com sucesso."); setEditOpen(false); await load(); await loadCompanyWorkspace(selectedCompany.id, "details"); }
  }

  async function signOut() { await auth.signOut(); router.replace("/login"); }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Consult Services</p><h1 className="text-xl font-semibold">Administração da plataforma</h1></div>
          <div className="flex items-center gap-3 text-sm"><span className="hidden text-slate-500 sm:inline">{auth.user?.email}</span><button type="button" onClick={() => void signOut()} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold">Sair</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <nav className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <strong>Empresas licenciadas</strong><p className="mt-1 text-sm text-slate-600">Cadastro de quem contrata e acessa o 7Commander. Esta área é separada do cadastro operacional de clientes dos projetos.</p>
        </nav>
        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
        <RetentionAlerts companies={companies} onSelect={(id) => void loadCompanyWorkspace(id, "details")} />

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {([['new', 'Nova empresa'], ['companies', 'Empresas'], ['details', 'Cadastro e edição'], ['users', 'Usuários'], ['history', 'Histórico']] as const).map(([key, label]) => <button key={key} type="button" disabled={(key === "details" || key === "users" || key === "history") && !selectedCompany} onClick={() => { if (selected && (key === "details" || key === "users" || key === "history")) void loadCompanyWorkspace(selected, key); else setTab(key); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === key ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"}`}>{label}</button>)}
        </div>

        <div>
          <form onSubmit={createCompany} className={`${tab === "new" ? "" : "hidden"} rounded-3xl border border-slate-200 bg-white p-6 shadow-sm`}>
            <h2 className="text-xl font-semibold">Cadastrar empresa licenciada</h2><p className="mt-1 text-sm text-slate-500">Contrato, licença, módulos e identidade visual ficam isolados por empresa.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nome fantasia"><input name="name" required className="workspace-input mt-1" /></Field>
              <Field label="Razão social"><input name="legalName" required className="workspace-input mt-1" /></Field>
              <Field label="CNPJ"><input name="taxId" required className="workspace-input mt-1" placeholder="00.000.000/0000-00" /></Field>
              <Field label="Plano"><select name="plan" className="workspace-input mt-1"><option value="professional">Profissional</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></Field>
              <Field label="E-mail da empresa"><input name="email" type="email" className="workspace-input mt-1" /></Field>
              <Field label="Telefone"><input name="phone" className="workspace-input mt-1" /></Field>
              <Field label="Início do contrato"><input name="contractStart" type="date" required className="workspace-input mt-1" /></Field>
              <Field label="Fim do contrato"><input name="contractEnd" type="date" required className="workspace-input mt-1" /></Field>
              <Field label="Dia de vencimento"><input name="billingDay" type="number" min="1" max="31" className="workspace-input mt-1" /></Field>
              <Field label="Usuários contratados"><input name="licensedUsers" type="number" min="1" defaultValue="10" className="workspace-input mt-1" /></Field>
              <Field label="Situação da licença"><select name="status" className="workspace-input mt-1"><option value="active">Ativa</option><option value="pending">Pendente</option><option value="suspended">Suspensa</option></select></Field>
              <Field label="Responsável pelo contrato"><input name="contactName" className="workspace-input mt-1" /></Field>
              <Field label="E-mail do responsável"><input name="contactEmail" type="email" className="workspace-input mt-1" /></Field>
              <Field label="Telefone do responsável"><input name="contactPhone" className="workspace-input mt-1" /></Field>
              <Field label="CEP"><input name="zipCode" className="workspace-input mt-1" /></Field><Field label="Logradouro"><input name="street" className="workspace-input mt-1" /></Field>
              <Field label="Número"><input name="number" className="workspace-input mt-1" /></Field><Field label="Cidade"><input name="city" className="workspace-input mt-1" /></Field>
              <Field label="Estado"><input name="state" maxLength={2} className="workspace-input mt-1" /></Field><div />
            </div>
            <h3 className="mt-7 font-semibold">White label da empresa</h3>
            <p className="mt-1 text-sm text-slate-500">Envie a logo da empresa. As cores predominantes serão sugeridas e poderão ser ajustadas antes de salvar.</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-[180px_1fr]">
              <div className="flex min-h-32 items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
                {logoUrl ? <img src={logoUrl} alt="Prévia da logo da empresa" className="max-h-24 max-w-full rounded-lg object-contain" /> : <span className="text-center text-xs text-slate-400">Prévia da logo</span>}{/* eslint-disable-line @next/next/no-img-element */}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome exibido"><input name="brandName" value={brandDisplayName} onChange={(event) => setBrandDisplayName(event.target.value)} className="workspace-input mt-1" /></Field>
                <Field label="Logo da empresa">
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Escolher arquivo</span>
                    <span className="text-xs font-normal text-slate-500">{logoFileName || "Nenhum arquivo selecionado"}</span>
                  </span>
                  <input type="file" accept="image/*" onChange={selectLogo} className="sr-only" />
                </Field>
                <Field label="Cor principal"><input name="primaryColor" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></Field>
                <Field label="Cor de destaque"><input name="secondaryColor" type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="mt-1 h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></Field>
                {logoUrl ? <button type="button" onClick={removeLogo} className="w-fit text-sm font-semibold text-red-600">Remover logo</button> : null}
              </div>
            </div>
            <BrandPreview logoUrl={logoUrl} companyName={brandDisplayName || "Sua empresa"} palette={palette} onExpand={() => setPreviewOpen(true)} />
            <h3 className="mt-7 font-semibold">Módulos liberados</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">{MODULES.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name={`module-${key}`} defaultChecked />{label}</label>)}</div>
            <button className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Salvar empresa licenciada</button>
          </form>

          <div className="space-y-6">
            <form onSubmit={createUser} className={`${tab === "users" ? "" : "hidden"} rounded-3xl border border-slate-200 bg-white p-6 shadow-sm`}><h2 className="text-xl font-semibold">Usuários de {selectedCompany?.name || "empresa"}</h2><p className="mt-1 text-sm text-slate-500">Cadastre, corrija ou inative acessos sem apagar o histórico.</p><div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Empresa licenciada"><select value={selected} onChange={(event) => setSelected(event.target.value)} required className="workspace-input mt-1"><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field>
              <Field label="Nome"><input name="name" required className="workspace-input mt-1" /></Field><Field label="E-mail"><input name="email" type="email" required className="workspace-input mt-1" /></Field>
              <Field label="Senha temporária"><input name="password" type="password" minLength={8} className="workspace-input mt-1" /><small className="mt-1 block text-slate-500">Obrigatória apenas para um novo e-mail. Contas existentes serão apenas vinculadas.</small></Field>
              <Field label="Perfil"><select name="role" className="workspace-input mt-1"><option value="owner">Responsável</option><option value="admin">Administrador</option><option value="manager">Gestor</option><option value="member">Usuário</option></select></Field>
            </div><button className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Cadastrar usuário</button></form>

            {tab === "users" ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Usuários cadastrados</h2>{users.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum usuário vinculado a esta empresa.</p> : <div className="mt-4 space-y-3">{users.map((user) => <UserEditor key={user.id} user={user} onSave={(changes) => void updateUser(user, changes)} />)}</div>}</section> : null}

            {tab === "companies" ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="text-xl font-semibold">Empresas licenciadas</h2><p className="mt-1 text-sm text-slate-500">Pesquise por nome, razão social, CNPJ, e-mail ou responsável.</p></div><Field label="Pesquisar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite para localizar" className="workspace-input mt-1 min-w-72" /></Field></div>{loading ? <p className="mt-3 text-sm">Carregando...</p> : filteredCompanies.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhuma empresa encontrada.</p> : <div className="mt-5 grid gap-3 md:grid-cols-2">{filteredCompanies.map((company) => <button type="button" onClick={() => void loadCompanyWorkspace(company.id, "details")} key={company.id} className={`w-full rounded-xl border p-4 text-left ${selected === company.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><div className="flex justify-between gap-3"><strong>{company.name}</strong><span className={`text-xs font-semibold uppercase ${company.status === "active" ? "text-emerald-700" : "text-amber-700"}`}>{company.status === "suspended" ? "Inativa" : company.status}</span></div><p className="mt-1 text-xs text-slate-500">CNPJ: {company.tax_id || "-"}</p><p className="mt-1 text-xs text-slate-500">{company.plan} · {company.organization_members?.length || 0}/{company.licensed_users} usuários</p><p className="mt-1 text-xs text-slate-500">Contrato: {company.contract_start || "-"} a {company.contract_end || "-"}</p></button>)}</div>}</section> : null}

            {selectedCompany && tab === "details" ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Cadastro selecionado</p><h2 className="mt-1 text-xl font-semibold">{selectedCompany.name}</h2></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${selectedCompany.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{selectedCompany.status === "suspended" ? "Inativa" : selectedCompany.status}</span><button type="button" onClick={() => openEditor(selectedCompany)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Editar</button></div></div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Razão social" value={selectedCompany.legal_name} />
                <Detail label="CNPJ" value={selectedCompany.tax_id} />
                <Detail label="Plano" value={selectedCompany.plan} />
                <Detail label="Usuários" value={`${selectedCompany.organization_members?.length || 0}/${selectedCompany.licensed_users}`} />
                <Detail label="E-mail" value={selectedCompany.email} />
                <Detail label="Telefone" value={selectedCompany.phone} />
                <Detail label="Contrato" value={`${selectedCompany.contract_start || "-"} a ${selectedCompany.contract_end || "-"}`} />
                <Detail label="Vencimento" value={selectedCompany.billing_day ? `Dia ${selectedCompany.billing_day}` : "-"} />
                <Detail label="Responsável" value={selectedCompany.contract_contact?.name} />
                <Detail label="Contato" value={selectedCompany.contract_contact?.email || selectedCompany.contract_contact?.phone} />
                <Detail label="Endereço" value={[selectedCompany.address?.street, selectedCompany.address?.number, selectedCompany.address?.city, selectedCompany.address?.state].filter(Boolean).join(", ")} />
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">White label</p><div className="mt-3 flex items-center gap-4">{selectedCompany.branding?.logoUrl ? <img src={selectedCompany.branding.logoUrl} alt={`Logo ${selectedCompany.name}`} className="h-16 w-20 rounded-lg border border-slate-200 object-contain p-1" /> : <div className="flex h-16 w-20 items-center justify-center rounded-lg border border-dashed text-xs text-slate-400">Sem logo</div>}<div><strong>{selectedCompany.branding?.displayName || selectedCompany.name}</strong><div className="mt-2 flex gap-2"><ColorSample label="Principal" color={selectedCompany.branding?.primaryColor} /><ColorSample label="Destaque" color={selectedCompany.branding?.secondaryColor} /></div></div></div></div>
              <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Módulos liberados</p><div className="mt-2 flex flex-wrap gap-2">{selectedCompany.organization_modules?.filter((module) => module.enabled).map((module) => <span key={module.module_key} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{MODULES.find(([key]) => key === module.module_key)?.[1] || module.module_key}</span>)}</div></div>
              {selectedCompany.status === "suspended" ? <RetentionNotice company={selectedCompany} /> : null}
              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-5"><button type="button" onClick={() => openEditor(selectedCompany)} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Editar cadastro, licença e white label</button><button type="button" onClick={() => setTab("users")} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">Ver usuários</button><button type="button" onClick={() => setTab("history")} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">Ver histórico</button></div>
            </section> : null}
            {selectedCompany && tab === "history" ? <AuditHistory company={selectedCompany} events={events} /> : null}
          </div>
        </div>
      </div>
      {previewOpen ? <BrandPreviewModal logoUrl={logoUrl} companyName={brandDisplayName || "Sua empresa"} palette={palette} onClose={() => setPreviewOpen(false)} /> : null}
      {editOpen && selectedCompany ? <EditCompanyModal company={selectedCompany} onClose={() => setEditOpen(false)} onSubmit={updateCompany} logoUrl={editLogoUrl} brandName={editBrandName} primaryColor={editPrimaryColor} secondaryColor={editSecondaryColor} onLogoChange={selectEditLogo} onBrandNameChange={setEditBrandName} onPrimaryChange={setEditPrimaryColor} onSecondaryChange={setEditSecondaryColor} /> : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-slate-800">{value || "-"}</p></div>;
}

function ColorSample({ label, color }: { label: string; color?: string }) {
  return <span className="flex items-center gap-1 text-xs text-slate-500"><i className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: color || "#ffffff" }} />{label}: {color || "-"}</span>;
}

function UserEditor({ user, onSave }: { user: CompanyUser; onSave: (changes: Partial<CompanyUser>) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  return <article className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><strong>{user.name || user.email}</strong><p className="text-sm text-slate-500">{user.email} · {roleLabel(user.role)} · {user.status === "active" ? "Ativo" : "Inativo"}</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditing((current) => !current)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">{editing ? "Cancelar" : "Editar"}</button><button type="button" onClick={() => { if (window.confirm(`${user.status === "active" ? "Inativar" : "Reativar"} este usuário?`)) onSave({ status: user.status === "active" ? "inactive" : "active" }); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${user.status === "active" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{user.status === "active" ? "Inativar" : "Reativar"}</button></div></div>{editing ? <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-3"><Field label="Nome"><input value={name} onChange={(event) => setName(event.target.value)} className="workspace-input mt-1" /></Field><Field label="E-mail"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="workspace-input mt-1" /></Field><Field label="Perfil"><select value={role} onChange={(event) => setRole(event.target.value)} className="workspace-input mt-1"><option value="owner">Responsável</option><option value="admin">Administrador</option><option value="manager">Gestor</option><option value="member">Usuário</option></select></Field><button type="button" onClick={() => { onSave({ name, email, role }); setEditing(false); }} className="w-fit rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Salvar usuário</button></div> : null}</article>;
}

function AuditHistory({ company, events }: { company: LicensedCompany; events: AuditEvent[] }) {
  const labels: Record<string, string> = { "client.created": "Empresa cadastrada", "client.updated": "Cadastro atualizado", "client.status.inactive": "Empresa inativada", "client.status.active": "Empresa reativada", "user.provisioned": "Usuário criado", "user.linked": "Usuário vinculado", "user.updated": "Usuário atualizado", "user.status.active": "Usuário reativado", "user.status.inactive": "Usuário inativado" };
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Histórico de {company.name}</h2><p className="mt-1 text-sm text-slate-500">Últimas 100 ações administrativas registradas.</p>{events.length === 0 ? <p className="mt-5 text-sm text-slate-500">Ainda não há eventos registrados.</p> : <ol className="mt-5 space-y-3">{events.map((event) => <li key={event.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><strong>{labels[event.action] || event.action}</strong><time className="text-xs text-slate-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.created_at))}</time></div><p className="mt-1 text-xs text-slate-500">{event.entity_type}</p></li>)}</ol>}</section>;
}

function roleLabel(role: string) { return ({ owner: "Responsável", admin: "Administrador", manager: "Gestor", member: "Usuário" } as Record<string, string>)[role] || role; }

function retentionState(retentionUntil?: string) {
  if (!retentionUntil) return null;
  const days = Math.ceil((new Date(retentionUntil).getTime() - Date.now()) / 86400000);
  return { days, urgent: days <= 90, expired: days <= 0 };
}

function RetentionAlerts({ companies, onSelect }: { companies: LicensedCompany[]; onSelect: (id: string) => void }) {
  const alerts = companies.filter((company) => company.status === "suspended" && retentionState(company.quotas?.lifecycle?.retentionUntil)?.urgent);
  if (!alerts.length) return null;
  return <section className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="font-semibold text-amber-900">Retenções próximas do prazo</p><div className="mt-2 flex flex-wrap gap-2">{alerts.map((company) => <button type="button" key={company.id} onClick={() => onSelect(company.id)} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm">{company.name}: {formatDate(company.quotas?.lifecycle?.retentionUntil)}</button>)}</div></section>;
}

function RetentionNotice({ company }: { company: LicensedCompany }) {
  const lifecycle = company.quotas?.lifecycle;
  const state = retentionState(lifecycle?.retentionUntil);
  return <div className={`mt-5 rounded-2xl border p-4 ${state?.urgent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Retenção dos dados</p><p className="mt-2 text-sm text-slate-700">Inativada em: {formatDate(lifecycle?.inactiveAt)}. Motivo: {lifecycle?.inactiveReason || "-"}</p><p className="mt-1 text-sm font-semibold text-slate-800">Retenção prevista até {formatDate(lifecycle?.retentionUntil)}.</p>{state?.expired ? <p className="mt-2 text-sm font-bold text-red-700">Período concluído. Decisão administrativa necessária. Nenhum dado será apagado automaticamente.</p> : state?.urgent ? <p className="mt-2 text-sm font-bold text-amber-800">O período termina em aproximadamente {Math.max(0, state.days)} dias. Defina a destinação dos dados.</p> : null}</div>;
}

function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value)) : "-"; }

function EditCompanyModal({ company, onClose, onSubmit, logoUrl, brandName, primaryColor, secondaryColor, onLogoChange, onBrandNameChange, onPrimaryChange, onSecondaryChange }: { company: LicensedCompany; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; logoUrl: string; brandName: string; primaryColor: string; secondaryColor: string; onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void; onBrandNameChange: (value: string) => void; onPrimaryChange: (value: string) => void; onSecondaryChange: (value: string) => void }) {
  const enabled = new Set(company.organization_modules?.filter((item) => item.enabled).map((item) => item.module_key));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0" /><form onSubmit={onSubmit} className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Empresa licenciada</p><h2 className="mt-1 text-xl font-semibold">Editar {company.name}</h2></div><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Fechar</button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Nome fantasia"><input name="name" required defaultValue={company.name} className="workspace-input mt-1" /></Field><Field label="Razão social"><input name="legalName" required defaultValue={company.legal_name} className="workspace-input mt-1" /></Field><Field label="CNPJ"><input name="taxId" required defaultValue={company.tax_id} className="workspace-input mt-1" /></Field><Field label="Plano"><select name="plan" defaultValue={company.plan} className="workspace-input mt-1"><option value="professional">Profissional</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></Field><Field label="E-mail"><input name="email" type="email" defaultValue={company.email} className="workspace-input mt-1" /></Field><Field label="Telefone"><input name="phone" defaultValue={company.phone} className="workspace-input mt-1" /></Field><Field label="Início do contrato"><input name="contractStart" type="date" defaultValue={company.contract_start} className="workspace-input mt-1" /></Field><Field label="Fim do contrato"><input name="contractEnd" type="date" defaultValue={company.contract_end} className="workspace-input mt-1" /></Field><Field label="Dia de vencimento"><input name="billingDay" type="number" min="1" max="31" defaultValue={company.billing_day} className="workspace-input mt-1" /></Field><Field label="Usuários contratados"><input name="licensedUsers" type="number" min="1" defaultValue={company.licensed_users} className="workspace-input mt-1" /></Field><Field label="Situação"><select name="status" defaultValue={company.status} className="workspace-input mt-1"><option value="active">Ativa</option><option value="pending">Pendente</option><option value="suspended">Inativa</option></select></Field><Field label="Motivo da inativação"><input name="inactiveReason" defaultValue={company.quotas?.lifecycle?.inactiveReason} placeholder="Ex.: mensalidade em atraso" className="workspace-input mt-1" /></Field><Field label="Responsável pelo contrato"><input name="contactName" defaultValue={company.contract_contact?.name} className="workspace-input mt-1" /></Field><Field label="E-mail do responsável"><input name="contactEmail" type="email" defaultValue={company.contract_contact?.email} className="workspace-input mt-1" /></Field><Field label="Telefone do responsável"><input name="contactPhone" defaultValue={company.contract_contact?.phone} className="workspace-input mt-1" /></Field><Field label="CEP"><input name="zipCode" defaultValue={company.address?.zipCode} className="workspace-input mt-1" /></Field><Field label="Logradouro"><input name="street" defaultValue={company.address?.street} className="workspace-input mt-1" /></Field><Field label="Número"><input name="number" defaultValue={company.address?.number} className="workspace-input mt-1" /></Field><Field label="Cidade"><input name="city" defaultValue={company.address?.city} className="workspace-input mt-1" /></Field><Field label="Estado"><input name="state" maxLength={2} defaultValue={company.address?.state} className="workspace-input mt-1" /></Field></div><h3 className="mt-6 font-semibold">White label</h3><div className="mt-3 grid gap-4 md:grid-cols-[140px_1fr]"><div className="flex h-28 items-center justify-center rounded-xl border bg-white p-3">{logoUrl ? <img src={logoUrl} alt="Logo da empresa" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">Sem logo</span>}</div><div className="grid gap-3 sm:grid-cols-2"><Field label="Nome exibido"><input value={brandName} onChange={(event) => onBrandNameChange(event.target.value)} className="workspace-input mt-1" /></Field><Field label="Substituir logo"><input type="file" accept="image/*" onChange={onLogoChange} className="mt-2 block w-full text-xs" /></Field><Field label="Cor principal"><input type="color" value={primaryColor} onChange={(event) => onPrimaryChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border p-1" /></Field><Field label="Cor de destaque"><input type="color" value={secondaryColor} onChange={(event) => onSecondaryChange(event.target.value)} className="mt-1 h-11 w-full rounded-lg border p-1" /></Field></div></div><h3 className="mt-6 font-semibold">Módulos liberados</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">{MODULES.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name={`edit-module-${key}`} defaultChecked={enabled.has(key)} />{label}</label>)}</div><div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Inativar bloqueia o acesso, mas preserva todos os dados. A retenção de cinco anos começa na data da inativação. Não há exclusão automática.</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">Cancelar</button><button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Salvar alterações</button></div></form></div>;
}

type PreviewPalette = ReturnType<typeof deriveBrandPalette>;

function BrandPreview({ logoUrl, companyName, palette, onExpand }: { logoUrl: string; companyName: string; palette: PreviewPalette; onExpand: () => void }) {
  return <div className="mt-6"><div className="mb-2 flex items-center justify-between"><div><h4 className="font-semibold">Prévia do sistema</h4><p className="text-xs text-slate-500">Clique para ampliar e validar a identidade antes de salvar.</p></div><button type="button" onClick={onExpand} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Ampliar</button></div><button type="button" onClick={onExpand} className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left shadow-sm"><WorkspacePreview logoUrl={logoUrl} companyName={companyName} palette={palette} compact /></button></div>;
}

function BrandPreviewModal({ logoUrl, companyName, palette, onClose }: { logoUrl: string; companyName: string; palette: PreviewPalette; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Prévia ampliada do white label"><button type="button" aria-label="Fechar prévia" onClick={onClose} className="absolute inset-0" /><div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><strong>Prévia ampliada do white label</strong><p className="text-xs text-slate-500">Representação da tela principal com a paleta gerada automaticamente.</p></div><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Fechar</button></div><WorkspacePreview logoUrl={logoUrl} companyName={companyName} palette={palette} /></div></div>;
}

function WorkspacePreview({ logoUrl, companyName, palette, compact = false }: { logoUrl: string; companyName: string; palette: PreviewPalette; compact?: boolean }) {
  return <div className={`flex bg-slate-100 ${compact ? "h-64" : "h-[68vh] min-h-[480px]"}`}><aside className={`${compact ? "w-28" : "w-56"} flex-shrink-0 text-white`} style={{ backgroundColor: palette.sidebarColor }}><div className={`${compact ? "h-16 p-2" : "h-28 p-4"} flex items-center justify-center rounded-br-2xl bg-white`}>{logoUrl ? <img src={logoUrl} alt="Logo na prévia" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">Sua logo</span>}</div><div className={compact ? "p-2" : "p-4"}><p className={`${compact ? "text-[7px]" : "text-[10px]"} font-black uppercase tracking-widest`} style={{ color: palette.highlightColor }}>7Commander</p><p className={`${compact ? "mt-1 text-[7px]" : "mt-2 text-xs"} font-semibold`}>{companyName}</p><div className={compact ? "mt-3 space-y-1" : "mt-7 space-y-2"}>{["Início", "Projetos", "Atividades", "Kairos"].map((item, index) => <div key={item} className={`${compact ? "rounded px-2 py-1 text-[7px]" : "rounded-lg px-3 py-2 text-xs"} font-semibold`} style={index === 0 ? { backgroundColor: palette.highlightColor, color: palette.contrastColor } : undefined}>{item}</div>)}</div></div></aside><div className="min-w-0 flex-1"><header className={`${compact ? "h-9 px-3" : "h-14 px-6"} flex items-center border-b border-slate-200 bg-white`}><span className={`${compact ? "text-[7px]" : "text-xs"} font-bold uppercase tracking-wider`} style={{ color: palette.primaryColor }}>Workspace ativo</span></header><main className={compact ? "p-3" : "p-6"}><section className={`${compact ? "p-3" : "p-6"} rounded-xl border border-slate-200 bg-white`}><h3 className={`${compact ? "text-xs" : "text-xl"} font-semibold text-slate-800`}>Bom dia, Christian</h3><p className={`${compact ? "mt-1 text-[7px]" : "mt-2 text-sm"} text-slate-500`}>Acompanhe seus projetos e atividades.</p><button type="button" tabIndex={-1} className={`${compact ? "mt-2 rounded px-2 py-1 text-[7px]" : "mt-4 rounded-lg px-4 py-2 text-sm"} font-semibold`} style={{ backgroundColor: palette.primaryColor, color: palette.contrastColor }}>Criar projeto</button></section><section className={`${compact ? "mt-2 p-2" : "mt-4 p-4"} rounded-xl border`} style={{ backgroundColor: palette.softColor, borderColor: palette.primaryColor }}><p className={`${compact ? "text-[7px]" : "text-sm"} font-semibold`} style={{ color: palette.sidebarColor }}>Kairos disponível</p></section><div className={`${compact ? "mt-2 gap-2" : "mt-4 gap-4"} grid grid-cols-3`}>{["Projetos", "Ativos", "Em risco"].map((item) => <div key={item} className={`${compact ? "p-2" : "p-4"} rounded-xl border border-slate-200 bg-white`}><span className={`${compact ? "text-[6px]" : "text-xs"} uppercase text-slate-500`}>{item}</span><div className={`${compact ? "mt-1 text-sm" : "mt-4 text-2xl"} font-semibold text-slate-800`}>0</div></div>)}</div></main></div></div>;
}
