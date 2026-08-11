"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { getClientAuthHeaders } from "@/lib/client-auth";

const MODULES = [
  ["projects", "Projetos"], ["daily", "Daily"], ["kairos", "Kairos"], ["voice", "Voice Room"],
  ["knowledge", "Conhecimento"], ["clients", "Clientes operacionais"], ["activities", "Atividades"], ["memory", "Memória"],
] as const;

type LicensedCompany = {
  id: string; name: string; legal_name?: string; tax_id?: string; status: string; plan: string;
  contract_start?: string; contract_end?: string; licensed_users: number;
  organization_members?: Array<{ id: string }>;
  branding?: { displayName?: string; logoUrl?: string; primaryColor?: string; secondaryColor?: string };
};

export default function PlatformAdminPage() {
  const auth = useKairosAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<LicensedCompany[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
      branding: { displayName: data.get("brandName") || data.get("name"), logoUrl: data.get("logoUrl"), primaryColor: data.get("primaryColor"), secondaryColor: data.get("secondaryColor") },
      modules,
    };
    const response = await fetch("/api/platform/clients", { method: "POST", headers: getClientAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível cadastrar a empresa.");
    else { setMessage("Empresa licenciada cadastrada com sucesso."); form.reset(); await load(); }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch("/api/platform/users", { method: "POST", headers: getClientAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ organizationId: selected, name: data.get("name"), email: data.get("email"), temporaryPassword: data.get("password"), role: data.get("role") }) });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Não foi possível cadastrar o usuário.");
    else { setMessage(result.existingUser ? "Usuário existente vinculado à empresa com sucesso." : "Usuário criado. O e-mail de confirmação foi enviado."); form.reset(); await load(); }
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

        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <form onSubmit={createCompany} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
            <div className="mt-3 grid gap-4 md:grid-cols-2"><Field label="Nome exibido"><input name="brandName" className="workspace-input mt-1" /></Field><Field label="URL da logo"><input name="logoUrl" type="url" className="workspace-input mt-1" /></Field><Field label="Cor principal"><input name="primaryColor" type="color" defaultValue="#003B73" className="mt-1 h-11 w-full rounded-lg border" /></Field><Field label="Cor de destaque"><input name="secondaryColor" type="color" defaultValue="#00AEEF" className="mt-1 h-11 w-full rounded-lg border" /></Field></div>
            <h3 className="mt-7 font-semibold">Módulos liberados</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">{MODULES.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" name={`module-${key}`} defaultChecked />{label}</label>)}</div>
            <button className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Salvar empresa licenciada</button>
          </form>

          <div className="space-y-6">
            <form onSubmit={createUser} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Usuários da empresa</h2><p className="mt-1 text-sm text-slate-500">Cada usuário será vinculado somente à empresa selecionada.</p><div className="mt-5 space-y-4">
              <Field label="Empresa licenciada"><select value={selected} onChange={(event) => setSelected(event.target.value)} required className="workspace-input mt-1"><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field>
              <Field label="Nome"><input name="name" required className="workspace-input mt-1" /></Field><Field label="E-mail"><input name="email" type="email" required className="workspace-input mt-1" /></Field>
              <Field label="Senha temporária"><input name="password" type="password" minLength={8} className="workspace-input mt-1" /><small className="mt-1 block text-slate-500">Obrigatória apenas para um novo e-mail. Contas existentes serão apenas vinculadas.</small></Field>
              <Field label="Perfil"><select name="role" className="workspace-input mt-1"><option value="owner">Responsável</option><option value="admin">Administrador</option><option value="manager">Gestor</option><option value="member">Usuário</option></select></Field>
            </div><button className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Cadastrar usuário</button></form>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Empresas licenciadas</h2>{loading ? <p className="mt-3 text-sm">Carregando...</p> : companies.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhuma empresa cadastrada.</p> : <div className="mt-4 space-y-3">{companies.map((company) => <button type="button" onClick={() => setSelected(company.id)} key={company.id} className={`w-full rounded-xl border p-4 text-left ${selected === company.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><div className="flex justify-between gap-3"><strong>{company.name}</strong><span className="text-xs font-semibold uppercase text-emerald-700">{company.status}</span></div><p className="mt-1 text-xs text-slate-500">CNPJ: {company.tax_id || "-"}</p><p className="mt-1 text-xs text-slate-500">{company.plan} · {company.organization_members?.length || 0}/{company.licensed_users} usuários</p><p className="mt-1 text-xs text-slate-500">Contrato: {company.contract_start || "-"} a {company.contract_end || "-"}</p></button>)}</div>}</section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
