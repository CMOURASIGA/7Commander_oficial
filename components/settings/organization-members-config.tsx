"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";

type Member = { id: string; role: string; status: string; profiles?: { email?: string; nome?: string } | null };
type Invite = { id: string; email: string; role: string; status: string; expires_at: string };
type Payload = {
  organization: { name: string; role: string };
  members: Member[];
  invites: Invite[];
};

export function OrganizationMembersConfig() {
  const [data, setData] = useState<Payload | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/organization/members", { headers: getClientAuthHeaders() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Falha ao carregar usuarios.");
    setData(payload.data);
  }, []);

  useEffect(() => {
    void load().catch((error) => setStatus(error instanceof Error ? error.message : "Falha ao carregar usuarios."));
  }, [load]);

  const canInvite = data?.organization.role === "owner" || data?.organization.role === "admin";

  return (
    <section className="workspace-surface-card p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--accent)">Empresa e acessos</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-(--text-primary)">{data?.organization.name || "Empresa"}</h3>
          <p className="text-sm text-(--text-secondary)">Usuarios isolados neste ambiente do 7Commander.</p>
        </div>
        {data ? <span className="workspace-status-pill">Seu perfil: {data.organization.role}</span> : null}
      </div>

      <div className="mt-4 space-y-2">
        {(data?.members ?? []).map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-xl border border-(--border) px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-(--text-primary)">{member.profiles?.nome || member.profiles?.email || "Usuario"}</p>
              {member.profiles?.nome ? <p className="text-xs text-(--text-secondary)">{member.profiles.email}</p> : null}
            </div>
            <span className="text-xs font-semibold uppercase text-(--text-secondary)">{member.role}</span>
          </div>
        ))}
        {(data?.invites ?? []).map((invite) => (
          <div key={invite.id} className="flex items-center justify-between rounded-xl border border-dashed border-(--border) px-3 py-2 text-sm">
            <div><p className="font-medium text-(--text-primary)">{invite.email}</p><p className="text-xs text-(--text-secondary)">Convite pendente</p></div>
            <span className="text-xs font-semibold uppercase text-(--text-secondary)">{invite.role}</span>
          </div>
        ))}
      </div>

      {canInvite ? (
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]" onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            setSaving(true); setStatus("");
            try {
              const response = await fetch("/api/organization/members", {
                method: "POST",
                headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ email, role }),
              });
              const payload = await response.json();
              if (!response.ok) throw new Error(payload?.error || "Falha ao convidar usuario.");
              setEmail(""); setStatus("Convite registrado. O usuario deve entrar com este e-mail Google.");
              await load();
            } catch (error) { setStatus(error instanceof Error ? error.message : "Falha ao convidar usuario."); }
            finally { setSaving(false); }
          })();
        }}>
          <input className="workspace-input" type="email" required placeholder="usuario@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <select className="workspace-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="member">Membro</option><option value="manager">Gestor</option><option value="admin">Administrador</option>
          </select>
          <button className="workspace-button-primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Convidar"}</button>
        </form>
      ) : null}
      {status ? <p className="mt-3 text-sm text-(--text-secondary)">{status}</p> : null}
    </section>
  );
}

