"use client";

import { useEffect, useState } from "react";
import { Decision, DecisionStatus } from "@/types/decision";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { PageIntro, SectionLabel, StatusPill } from "@/components/ui/workspace-primitives";

const STATUS_LABELS: Record<DecisionStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

const STATUS_OPTIONS: DecisionStatus[] = ["aberta", "em_andamento", "concluida", "cancelada"];

type ProjectSummary = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  name: string;
  status: string;
  description: string;
  objective: string;
  context: string;
  stakeholders: string;
  maturity: string;
  tags: string[];
  isActive: boolean;
};

type ClientSummary = {
  id: string;
  name: string;
  status: "ativo" | "inativo";
};

type ProjectMember = {
  id: string;
  memberEmail: string;
  role: "owner" | "editor" | "viewer";
  status: "invited" | "active" | "revoked";
};

type KnowledgeItem = {
  id: string;
  title: string;
  category: string;
  source: string;
  content: string;
  createdAt: string;
};

type DecisionHistoryItem = {
  id: string;
  previousStatus: DecisionStatus | null;
  newStatus: DecisionStatus;
  source: string;
  note: string;
  createdAt: string;
};

type RiskItem = {
  id: string;
  title: string;
  impact: string;
  probability: string;
  mitigation: string;
  owner: string;
  status: "aberto" | "em_mitigacao" | "mitigado" | "encerrado";
  decisionId: string | null;
  taskId: string | null;
  createdAt: string;
};

type RoutineKey = "ingestion" | "risks" | "knowledge" | "members" | "decisions";

function ProjectRoutine({
  title,
  description,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="order-2 overflow-hidden rounded-xl border border-(--border) bg-(--bg-surface)">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--bg-muted)"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-soft) text-sm font-bold text-(--accent)">
          {isOpen ? "-" : "+"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-(--text-primary)">{title}</span>
          <span className="mt-0.5 block text-xs text-(--text-secondary)">{description}</span>
        </span>
        {badge ? <span className="rounded-full bg-(--bg-muted) px-2 py-1 text-[11px] font-medium text-(--text-secondary)">{badge}</span> : null}
      </button>
      {isOpen ? <div className="border-t border-(--border) bg-(--bg-muted)/50 p-4">{children}</div> : null}
    </section>
  );
}

function KnowledgeContent({ content }: { content: string }) {
  if (content.trim()) {
    return <MarkdownContent content={content} className="mt-2" />;
  }

  const lines = content.split(/\r?\n/);
  return (
    <div className="mt-2 space-y-2 text-xs leading-5 text-(--text-primary)">
      {lines.map((line, index) => {
        const value = line.trim();
        if (!value) return <div key={`space-${index}`} className="h-1" />;
        if (/^#{1,6}\s+/.test(value)) {
          return <p key={index} className="font-semibold text-(--accent-strong)">{value.replace(/^#{1,6}\s+/, "")}</p>;
        }
        if (/^[-*+]\s+/.test(value)) {
          return <p key={index} className="pl-4 before:mr-2 before:content-['•']">{value.replace(/^[-*+]\s+/, "")}</p>;
        }
        if (/^\d+[.)]\s+/.test(value)) {
          return <p key={index} className="pl-4">{value}</p>;
        }
        return <p key={index}>{value}</p>;
      })}
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientIdForCreate, setSelectedClientIdForCreate] = useState<string>("");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [openRoutine, setOpenRoutine] = useState<RoutineKey | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDecision, setCreatingDecision] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [decisionStatusMessage, setDecisionStatusMessage] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    context: "",
    reason: "",
    impact: "",
    status: "aberta" as DecisionStatus,
  });
  const [decisionHistoryById, setDecisionHistoryById] = useState<Record<string, DecisionHistoryItem[]>>({});
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestNotes, setIngestNotes] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [risksLoading, setRisksLoading] = useState(false);
  const [riskForm, setRiskForm] = useState({
    title: "",
    impact: "",
    probability: "",
    mitigation: "",
    owner: "",
    status: "aberto" as "aberto" | "em_mitigacao" | "mitigado" | "encerrado",
    decisionId: "",
    taskId: "",
  });
  const [riskStatusMessage, setRiskStatusMessage] = useState<string | null>(null);
  const [savingRisk, setSavingRisk] = useState(false);
  const [updatingRiskId, setUpdatingRiskId] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    objective: "",
    context: "",
    stakeholders: "",
    maturity: "",
    tags: "",
    status: "ativo",
    clientId: "",
  });

  const selectedProject = projects.find((item) => item.id === activeProjectId) ?? null;

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects", {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar projetos.");
      const list = (payload?.data ?? []) as ProjectSummary[];
      setProjects(list);
      setActiveProjectId(payload?.meta?.activeProjectId ?? null);
    } catch {
      setProjects([]);
      setActiveProjectId(null);
    }
  }

  async function loadClients() {
    try {
      const response = await fetch("/api/clients", {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar clientes.");
      const list = (payload?.data ?? []) as ClientSummary[];
      setClients(list.filter((item) => item.status === "ativo"));
    } catch {
      setClients([]);
    }
  }

  async function loadDecisions(projectId?: string | null) {
    setLoading(true);
    try {
      const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
      const response = await fetch(`/api/decisions${query}`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar decisoes.");
      setDecisions((payload?.data ?? []) as Decision[]);
    } catch {
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
    void loadClients();
    void loadDecisions(null);
  }, []);

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;

    setCreatingProject(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          clientId: selectedClientIdForCreate || null,
          name,
          status: "ativo",
          isActive: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao criar projeto.");
      setNewProjectName("");
      setSelectedClientIdForCreate("");
      await loadProjects();
    } catch {
      // no-op
    } finally {
      setCreatingProject(false);
    }
  }

  async function loadMembers(projectId: string) {
    setMembersLoading(true);
    setInviteStatus(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar membros.");
      setMembers((payload?.data ?? []) as ProjectMember[]);
      setCanManageMembers(Boolean(payload?.meta?.canManageMembers));
    } catch {
      setMembers([]);
      setCanManageMembers(false);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadKnowledge(projectId: string | null) {
    if (!projectId) {
      setKnowledgeItems([]);
      return;
    }

    setKnowledgeLoading(true);
    try {
      const response = await fetch(`/api/knowledge?projectId=${encodeURIComponent(projectId)}`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar conhecimento do projeto.");
      setKnowledgeItems((payload?.data ?? []) as KnowledgeItem[]);
    } catch {
      setKnowledgeItems([]);
    } finally {
      setKnowledgeLoading(false);
    }
  }

  async function loadRisks(projectId: string | null) {
    if (!projectId) {
      setRisks([]);
      return;
    }
    setRisksLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/risks`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar riscos do projeto.");
      setRisks((payload?.data ?? []) as RiskItem[]);
    } catch {
      setRisks([]);
    } finally {
      setRisksLoading(false);
    }
  }

  async function handleActivateProject(projectId: string) {
    setActiveProjectId(projectId);
    setOpenRoutine(null);
    try {
      await fetch("/api/projects/active", {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ projectId }),
      });
      await loadProjects();
      await loadDecisions(projectId);
      await loadRisks(projectId);
      const selected = projects.find((item) => item.id === projectId);
      if (selected) {
        setProjectForm({
          name: selected.name,
          description: selected.description ?? "",
          objective: selected.objective ?? "",
          context: selected.context ?? "",
          stakeholders: selected.stakeholders ?? "",
          maturity: selected.maturity ?? "",
          tags: (selected.tags ?? []).join(", "),
          status: selected.status ?? "ativo",
          clientId: selected.clientId ?? "",
        });
      }
      await loadMembers(projectId);
    } catch {
      // no-op
    }
  }

  async function handleInviteMember() {
    if (!activeProjectId || !inviteEmail.trim() || inviting) return;
    setInviting(true);
    setInviteStatus(null);
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/members`, {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao convidar membro.");
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteStatus("Convite enviado.");
      await loadMembers(activeProjectId);
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : "Falha ao convidar membro.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeMember(memberId: string) {
    if (!activeProjectId || !memberId || removingMemberId) return;
    setRemovingMemberId(memberId);
    setInviteStatus(null);
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/members/${memberId}`, {
        method: "DELETE",
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao revogar membro.");
      await loadMembers(activeProjectId);
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : "Falha ao revogar membro.");
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleStatusChange(decisionId: string, status: DecisionStatus) {
    setUpdatingId(decisionId);
    try {
      const response = await fetch(`/api/decisions/${decisionId}/status`, {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          status,
          source: "workspace",
          note: "Status alterado no workspace do projeto.",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao atualizar status.");

      const updated = payload?.data as Decision;
      setDecisions((prev) => prev.map((item) => (item.id === decisionId ? updated : item)));
    } catch {
      // keep current state if request fails
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreateDecision() {
    if (!activeProjectId || !decisionForm.title.trim() || creatingDecision) return;
    setCreatingDecision(true);
    setDecisionStatusMessage(null);
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/decisions`, {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: decisionForm.title.trim(),
          context: decisionForm.context.trim(),
          reason: decisionForm.reason.trim(),
          impact: decisionForm.impact.trim(),
          status: decisionForm.status,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao criar decisao.");
      setDecisionForm({
        title: "",
        context: "",
        reason: "",
        impact: "",
        status: "aberta",
      });
      setDecisionStatusMessage("Decisao criada.");
      await loadDecisions(activeProjectId);
    } catch (error) {
      setDecisionStatusMessage(error instanceof Error ? error.message : "Falha ao criar decisao.");
    } finally {
      setCreatingDecision(false);
    }
  }

  async function loadDecisionHistory(decisionId: string) {
    setHistoryLoadingId(decisionId);
    try {
      const response = await fetch(`/api/decisions/${decisionId}/history`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar historico.");
      setDecisionHistoryById((prev) => ({
        ...prev,
        [decisionId]: (payload?.data ?? []) as DecisionHistoryItem[],
      }));
    } catch {
      setDecisionHistoryById((prev) => ({ ...prev, [decisionId]: [] }));
    } finally {
      setHistoryLoadingId(null);
    }
  }

  async function handleIngestKnowledge() {
    if (!activeProjectId || !ingestFile || ingesting) return;
    setIngesting(true);
    setIngestStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", ingestFile);
      formData.append("projectId", activeProjectId);
      if (ingestNotes.trim()) {
        formData.append("notes", ingestNotes.trim());
      }

      const response = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: getClientAuthHeaders(),
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao ingerir arquivo.");

      const appliedFields = Array.isArray(payload?.data?.appliedFields)
        ? payload.data.appliedFields.join(", ")
        : "";
      const updatedMessage = payload?.data?.projectUpdated
        ? `Projeto atualizado (${appliedFields || "campos principais"}).`
        : "Conteudo ingerido, sem atualizacao estrutural necessaria.";
      const summary = String(payload?.data?.summary ?? "").trim();
      setIngestStatus(summary ? `${updatedMessage} Trecho lido: ${summary.slice(0, 220)}...` : updatedMessage);
      setIngestFile(null);
      setIngestNotes("");
      await loadProjects();
      await loadKnowledge(activeProjectId);
    } catch (error) {
      setIngestStatus(error instanceof Error ? error.message : "Falha na ingestao.");
    } finally {
      setIngesting(false);
    }
  }

  async function handleSaveProjectDetails() {
    if (!activeProjectId || savingProject) return;
    setSavingProject(true);
    setProjectStatus(null);
    try {
      const response = await fetch(`/api/projects/${activeProjectId}`, {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          clientId: projectForm.clientId || null,
          name: projectForm.name.trim(),
          description: projectForm.description.trim(),
          objective: projectForm.objective.trim(),
          context: projectForm.context.trim(),
          stakeholders: projectForm.stakeholders.trim(),
          maturity: projectForm.maturity.trim(),
          tags: projectForm.tags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          status: projectForm.status,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao atualizar projeto.");
      setProjectStatus("Projeto atualizado com sucesso.");
      await loadProjects();
    } catch (error) {
      setProjectStatus(error instanceof Error ? error.message : "Falha ao atualizar projeto.");
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteKnowledge(item: KnowledgeItem) {
    if (!activeProjectId || deletingKnowledgeId || !window.confirm(`Excluir "${item.title}"? Depois você poderá enviar o arquivo original novamente.`)) return;
    setDeletingKnowledgeId(item.id);
    try {
      const response = await fetch(`/api/knowledge?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers: getClientAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao excluir documento.");
      await loadKnowledge(activeProjectId);
    } finally {
      setDeletingKnowledgeId(null);
    }
  }

  async function handleCreateRisk() {
    if (!activeProjectId || !riskForm.title.trim() || savingRisk) return;
    setSavingRisk(true);
    setRiskStatusMessage(null);
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/risks`, {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: riskForm.title.trim(),
          impact: riskForm.impact.trim(),
          probability: riskForm.probability.trim(),
          mitigation: riskForm.mitigation.trim(),
          owner: riskForm.owner.trim(),
          status: riskForm.status,
          decisionId: riskForm.decisionId.trim() || null,
          taskId: riskForm.taskId.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao criar risco.");
      setRiskForm({
        title: "",
        impact: "",
        probability: "",
        mitigation: "",
        owner: "",
        status: "aberto",
        decisionId: "",
        taskId: "",
      });
      setRiskStatusMessage("Risco criado.");
      await loadRisks(activeProjectId);
    } catch (error) {
      setRiskStatusMessage(error instanceof Error ? error.message : "Falha ao criar risco.");
    } finally {
      setSavingRisk(false);
    }
  }

  async function handleRiskStatusChange(riskId: string, status: RiskItem["status"]) {
    setUpdatingRiskId(riskId);
    setRiskStatusMessage(null);
    try {
      const response = await fetch(`/api/risks/${riskId}`, {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao atualizar risco.");
      setRisks((prev) => prev.map((item) => (item.id === riskId ? (payload?.data as RiskItem) : item)));
    } catch (error) {
      setRiskStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar risco.");
    } finally {
      setUpdatingRiskId(null);
    }
  }

  useEffect(() => {
    if (!selectedProject) return;
    setProjectForm({
      name: selectedProject.name ?? "",
      description: selectedProject.description ?? "",
      objective: selectedProject.objective ?? "",
      context: selectedProject.context ?? "",
      stakeholders: selectedProject.stakeholders ?? "",
      maturity: selectedProject.maturity ?? "",
      tags: (selectedProject.tags ?? []).join(", "),
      status: selectedProject.status ?? "ativo",
      clientId: selectedProject.clientId ?? "",
    });
  }, [selectedProject]);

  useEffect(() => {
    if (!activeProjectId) {
      setMembers([]);
      setCanManageMembers(false);
      return;
    }
    void loadMembers(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    void loadKnowledge(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    void loadDecisions(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    void loadRisks(activeProjectId);
  }, [activeProjectId]);

  return (
    <section className="space-y-3">
      <PageIntro
        eyebrow="7Commander"
        title="Projetos e decisões"
        description="Projetos concentram contexto, documentos, riscos, membros e decisões do command center operacional."
        aside={
          <>
            <StatusPill tone="accent">{projects.length} projetos</StatusPill>
            <StatusPill tone="success">{decisions.length} decisões</StatusPill>
            <button type="button" onClick={() => void loadDecisions()} className="workspace-button-secondary">
              Atualizar
            </button>
          </>
        }
      />

      <article className="workspace-card flex flex-col gap-3 p-4">
        <SectionLabel>Projetos</SectionLabel>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Contextos ativos</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => void handleActivateProject(project.id)}
              className={[
                "rounded-xl border px-3 py-2 text-left text-xs",
                activeProjectId === project.id
                  ? "border-(--accent) bg-(--accent-soft) text-(--text-primary)"
                  : "border-(--border) bg-(--bg-muted) text-(--text-secondary)",
              ].join(" ")}
            >
              <p className="font-semibold">{project.name}</p>
              <p className="mt-1 text-[11px]">Cliente: {project.clientName ?? "Nao vinculado"}</p>
              <p className="mt-1">{project.status}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_240px_auto]">
          <input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="Novo projeto (ex.: IA para restaurantes)"
            className="workspace-input flex-1"
          />
          <select
            value={selectedClientIdForCreate}
            onChange={(event) => setSelectedClientIdForCreate(event.target.value)}
            className="workspace-select"
          >
            <option value="">Sem cliente vinculado</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleCreateProject()}
            disabled={creatingProject}
            className="workspace-button-primary"
          >
            {creatingProject ? "Criando..." : "Criar projeto"}
          </button>
        </div>
        {selectedProject ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--border) bg-(--bg-muted) px-3 py-2 text-xs">
            <span className="font-semibold text-(--text-primary)">Projeto em edição: {selectedProject.name}</span>
            <span className="text-(--text-secondary)">Cliente: {selectedProject.clientName ?? "Não vinculado"}</span>
            <a href="#detalhes-projeto" className="ml-auto text-(--accent) underline">Editar vínculo e detalhes</a>
          </div>
        ) : null}
        <ProjectRoutine
          title="Ingestao de arquivos"
          description="Envie documentos para extrair conhecimento e atualizar o contexto do projeto."
          badge={ingestFile ? "arquivo selecionado" : undefined}
          isOpen={openRoutine === "ingestion"}
          onToggle={() => setOpenRoutine((current) => current === "ingestion" ? null : "ingestion")}
        >
          <SectionLabel>Ingestão de documento/imagem</SectionLabel>
          <p className="text-xs text-(--text-secondary)">
            Envie arquivo para o projeto ativo. O 7Commander extrai conteúdo, salva conhecimento e atualiza o contexto do projeto.
          </p>
          <label className="workspace-button-secondary inline-flex cursor-pointer text-xs text-(--accent)">
            Selecionar arquivo do projeto
            <input
              type="file"
              onChange={(event) => setIngestFile(event.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <p className="text-xs text-(--text-secondary)">
            {ingestFile ? `Arquivo selecionado: ${ingestFile.name}` : "Nenhum arquivo selecionado"}
          </p>
          <input
            value={ingestNotes}
            onChange={(event) => setIngestNotes(event.target.value)}
            placeholder="Orientacoes opcionais para interpretacao do arquivo"
            className="workspace-input text-xs"
          />
          <button
            type="button"
            onClick={() => void handleIngestKnowledge()}
            disabled={!activeProjectId || !ingestFile || ingesting}
            className="workspace-button-primary"
          >
            {ingesting ? "Processando..." : "Enviar e estruturar projeto"}
          </button>
          {ingestStatus ? <p className="text-xs text-(--text-primary)">{ingestStatus}</p> : null}
        </ProjectRoutine>

        <ProjectRoutine
          title="Riscos do projeto"
          description="Registre, acompanhe status e defina a mitigacao dos riscos operacionais."
          badge={risks.length ? `${risks.length} registros` : undefined}
          isOpen={openRoutine === "risks"}
          onToggle={() => setOpenRoutine((current) => current === "risks" ? null : "risks")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
            Riscos do projeto
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={riskForm.title}
              onChange={(event) => setRiskForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Risco identificado"
              className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <input
              value={riskForm.owner}
              onChange={(event) => setRiskForm((prev) => ({ ...prev, owner: event.target.value }))}
              placeholder="Dono do risco"
              className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={riskForm.impact}
              onChange={(event) => setRiskForm((prev) => ({ ...prev, impact: event.target.value }))}
              placeholder="Impacto"
              className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <input
              value={riskForm.probability}
              onChange={(event) => setRiskForm((prev) => ({ ...prev, probability: event.target.value }))}
              placeholder="Probabilidade"
              className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={riskForm.decisionId}
              onChange={(event) => setRiskForm((prev) => ({ ...prev, decisionId: event.target.value }))}
              placeholder="Decision ID relacionado (opcional)"
              className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <input
              value={riskForm.taskId}
              onChange={(event) => setRiskForm((prev) => ({ ...prev, taskId: event.target.value }))}
              placeholder="Task ID relacionado (opcional)"
              className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
          </div>
          <textarea
            value={riskForm.mitigation}
            onChange={(event) => setRiskForm((prev) => ({ ...prev, mitigation: event.target.value }))}
            placeholder="Plano de mitigacao"
            className="min-h-20 w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={riskForm.status}
              onChange={(event) =>
                setRiskForm((prev) => ({ ...prev, status: event.target.value as RiskItem["status"] }))
              }
              className="rounded-lg border border-(--border) bg-white px-3 py-2 text-xs outline-none focus:border-(--accent)"
            >
              <option value="aberto">aberto</option>
              <option value="em_mitigacao">em_mitigacao</option>
              <option value="mitigado">mitigado</option>
              <option value="encerrado">encerrado</option>
            </select>
            <button
              type="button"
              onClick={() => void handleCreateRisk()}
              disabled={!activeProjectId || savingRisk}
              className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {savingRisk ? "Salvando risco..." : "Criar risco"}
            </button>
          </div>
          {riskStatusMessage ? <p className="text-xs text-(--text-primary)">{riskStatusMessage}</p> : null}

          <div className="space-y-2">
            {risksLoading ? (
              <p className="text-xs text-(--text-secondary)">Carregando riscos...</p>
            ) : risks.length === 0 ? (
              <p className="text-xs text-(--text-secondary)">Nenhum risco registrado para este projeto.</p>
            ) : (
              risks.map((risk) => (
                <article key={risk.id} className="rounded-lg border border-(--border) bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-(--text-primary)">{risk.title}</p>
                    <select
                      value={risk.status}
                      onChange={(event) => void handleRiskStatusChange(risk.id, event.target.value as RiskItem["status"])}
                      disabled={updatingRiskId === risk.id}
                      className="rounded-md border border-(--border) bg-white px-2 py-1 text-[11px] text-(--text-primary)"
                    >
                      <option value="aberto">aberto</option>
                      <option value="em_mitigacao">em_mitigacao</option>
                      <option value="mitigado">mitigado</option>
                      <option value="encerrado">encerrado</option>
                    </select>
                  </div>
                  <p className="mt-1 text-[11px] text-(--text-secondary)">
                    Impacto: {risk.impact || "Nao informado"} | Probabilidade: {risk.probability || "Nao informada"}
                  </p>
                  <p className="mt-1 text-[11px] text-(--text-secondary)">
                    Dono: {risk.owner || "Nao definido"} | Mitigacao: {risk.mitigation || "Nao definida"}
                  </p>
                  <p className="mt-1 text-[11px] text-(--text-secondary)">
                    Decisao: {risk.decisionId || "Nao vinculada"} | Tarefa: {risk.taskId || "Nao vinculada"}
                  </p>
                </article>
              ))
            )}
          </div>
        </ProjectRoutine>

        <ProjectRoutine
          title="Conhecimento do projeto"
          description="Consulte documentos processados e remova conhecimentos que nao forem mais relevantes."
          badge={knowledgeItems.length ? `${knowledgeItems.length} documentos` : undefined}
          isOpen={openRoutine === "knowledge"}
          onToggle={() => setOpenRoutine((current) => current === "knowledge" ? null : "knowledge")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
            Conhecimento ingerido no projeto
          </p>
          {knowledgeLoading ? (
            <p className="text-xs text-(--text-secondary)">Carregando documentos processados...</p>
          ) : knowledgeItems.length === 0 ? (
            <p className="text-xs text-(--text-secondary)">
              Nenhum documento/registro de conhecimento encontrado para este projeto.
            </p>
          ) : (
            <div className="space-y-2">
              {knowledgeItems.map((item) => (
                <article key={item.id} className="rounded-lg border border-(--border) bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-(--text-primary)">{item.title}</p>
                    <button type="button" onClick={() => void handleDeleteKnowledge(item)} disabled={deletingKnowledgeId === item.id} className="workspace-button-danger px-3 py-2 text-[11px]">
                      {deletingKnowledgeId === item.id ? "Excluindo..." : "Excluir documento"}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-(--text-secondary)">
                    {item.category} | {item.source} | {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </p>
                  <details className="group">
                    <summary className="mt-2 cursor-pointer text-xs font-medium text-(--accent)">
                      Ver conteúdo estruturado
                    </summary>
                    <KnowledgeContent content={item.content} />
                  </details>
                </article>
              ))}
            </div>
          )}
        </ProjectRoutine>

        {selectedProject ? (
          <div id="detalhes-projeto" className="order-1 space-y-2 rounded-xl border border-(--border-strong) bg-(--accent-ghost) p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
              Detalhes do projeto ativo
            </p>
            <input
              value={projectForm.name}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome do projeto"
              className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <select
              value={projectForm.clientId}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, clientId: event.target.value }))}
              className="w-full rounded-lg border border-(--border) bg-white px-3 py-2 text-xs outline-none focus:border-(--accent)"
            >
              <option value="">Sem cliente vinculado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <textarea
              value={projectForm.description}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descricao"
              className="min-h-20 w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <input
              value={projectForm.objective}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, objective: event.target.value }))}
              placeholder="Objetivo"
              className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <textarea
              value={projectForm.context}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, context: event.target.value }))}
              placeholder="Contexto"
              className="min-h-20 w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <input
              value={projectForm.stakeholders}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, stakeholders: event.target.value }))}
              placeholder="Stakeholders"
              className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
            />
            <div className="grid gap-2 md:grid-cols-3">
              <input
                value={projectForm.maturity}
                onChange={(event) => setProjectForm((prev) => ({ ...prev, maturity: event.target.value }))}
                placeholder="Maturidade"
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
              />
              <input
                value={projectForm.tags}
                onChange={(event) => setProjectForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="Tags separadas por virgula"
                className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
              />
              <select
                value={projectForm.status}
                onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-(--border) bg-white px-3 py-2 text-xs outline-none focus:border-(--accent)"
              >
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveProjectDetails()}
              disabled={savingProject}
              className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {savingProject ? "Salvando..." : "Salvar detalhes do projeto"}
            </button>
            {projectStatus ? <p className="text-xs text-(--text-primary)">{projectStatus}</p> : null}
          </div>
        ) : null}

        {selectedProject ? (
          <ProjectRoutine
            title="Membros e compartilhamento"
            description="Convide pessoas e administre as permissoes de acesso deste projeto."
            badge={members.length ? `${members.length} membros` : undefined}
            isOpen={openRoutine === "members"}
            onToggle={() => setOpenRoutine((current) => current === "members" ? null : "members")}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
              Compartilhamento do projeto
            </p>
            <p className="text-xs text-(--text-secondary)">
              Convide pessoas por e-mail e controle o papel de acesso.
            </p>
            {canManageMembers ? (
              <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="email@empresa.com"
                  className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
                />
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as "owner" | "editor" | "viewer")}
                  className="w-full rounded-lg border border-(--border) bg-white px-3 py-2 text-xs outline-none focus:border-(--accent)"
                >
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="owner">owner</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleInviteMember()}
                  disabled={inviting}
                  className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  {inviting ? "Enviando..." : "Convidar"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-(--text-secondary)">
                Somente o owner pode gerenciar membros deste projeto.
              </p>
            )}
            <div className="space-y-2">
              {membersLoading ? (
                <p className="text-xs text-(--text-secondary)">Carregando membros...</p>
              ) : members.length === 0 ? (
                <p className="text-xs text-(--text-secondary)">Sem membros adicionais.</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--border) bg-white px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-(--text-primary)">{member.memberEmail}</p>
                      <p className="text-(--text-secondary)">
                        {member.role} | {member.status}
                      </p>
                    </div>
                    {canManageMembers && member.role !== "owner" ? (
                      <button
                        type="button"
                        onClick={() => void handleRevokeMember(member.id)}
                        disabled={removingMemberId === member.id}
                        className="rounded-md border border-(--border) bg-(--bg-muted) px-2 py-1 text-[11px] text-(--text-primary)"
                      >
                        {removingMemberId === member.id ? "Revogando..." : "Revogar"}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            {inviteStatus ? <p className="text-xs text-(--text-primary)">{inviteStatus}</p> : null}
          </ProjectRoutine>
        ) : null}
      </article>

      <ProjectRoutine
        title="Decisoes do projeto"
        description="Crie, acompanhe o status e consulte o historico das decisoes operacionais."
        badge={decisions.length ? `${decisions.length} registros` : undefined}
        isOpen={openRoutine === "decisions"}
        onToggle={() => setOpenRoutine((current) => current === "decisions" ? null : "decisions")}
      >
      <article className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
        <p className="text-sm font-semibold text-(--text-primary)">Nova decisao do projeto</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <input
            value={decisionForm.title}
            onChange={(event) => setDecisionForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titulo da decisao"
            className="rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
          />
          <select
            value={decisionForm.status}
            onChange={(event) => setDecisionForm((prev) => ({ ...prev, status: event.target.value as DecisionStatus }))}
            className="rounded-lg border border-(--border) bg-white px-3 py-2 text-xs outline-none focus:border-(--accent)"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <input
          value={decisionForm.context}
          onChange={(event) => setDecisionForm((prev) => ({ ...prev, context: event.target.value }))}
          placeholder="Contexto"
          className="mt-2 w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
        />
        <textarea
          value={decisionForm.reason}
          onChange={(event) => setDecisionForm((prev) => ({ ...prev, reason: event.target.value }))}
          placeholder="Motivo/justificativa"
          className="mt-2 min-h-20 w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
        />
        <input
          value={decisionForm.impact}
          onChange={(event) => setDecisionForm((prev) => ({ ...prev, impact: event.target.value }))}
          placeholder="Impacto esperado"
          className="mt-2 w-full rounded-lg border border-(--border) px-3 py-2 text-xs outline-none focus:border-(--accent)"
        />
        <button
          type="button"
          onClick={() => void handleCreateDecision()}
          disabled={!activeProjectId || creatingDecision}
          className="mt-2 rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {creatingDecision ? "Criando..." : "Criar decisao"}
        </button>
        {decisionStatusMessage ? <p className="mt-2 text-xs text-(--text-primary)">{decisionStatusMessage}</p> : null}
      </article>

      {loading ? (
        <div className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 text-sm text-(--text-secondary)">
          Carregando decisoes...
        </div>
      ) : decisions.length === 0 ? (
        <div className="rounded-xl border border-(--border) bg-(--bg-surface) p-4 text-sm text-(--text-secondary)">
          Nenhuma decisao registrada. Use o chat PM e clique em &quot;Salvar decisao&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((decision) => (
            <article key={decision.id} className="rounded-xl border border-(--border) bg-(--bg-surface) p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-(--text-primary)">{decision.title}</p>
                <select
                  value={decision.status}
                  onChange={(event) =>
                    void handleStatusChange(decision.id, event.target.value as DecisionStatus)
                  }
                  disabled={updatingId === decision.id}
                  className="rounded-md border border-(--border) bg-white px-2 py-1 text-xs text-(--text-primary)"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-(--text-secondary)">{decision.reason || "Sem motivo registrado."}</p>
              <p className="mt-1 text-sm text-(--text-secondary)">
                Contexto: {decision.context || "Nao informado."}
              </p>
              <p className="mt-1 text-sm text-(--text-secondary)">
                Projeto relacionado: {decision.projectId || "Nao informado."}
              </p>
              <p className="mt-1 text-sm text-(--text-secondary)">
                Conversa: {decision.conversationId || "Nao vinculada"} | Artefato: {decision.artifactId || "Nao vinculado"}
              </p>
              <p className="mt-2 text-xs text-(--text-secondary)">
                Impacto: {decision.impact || "Nao informado"} | {new Date(decision.createdAt).toLocaleString("pt-BR")}
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void loadDecisionHistory(decision.id)}
                  disabled={historyLoadingId === decision.id}
                  className="rounded-md border border-(--border) bg-(--bg-muted) px-2 py-1 text-[11px] text-(--text-primary)"
                >
                  {historyLoadingId === decision.id ? "Carregando historico..." : "Ver historico de status"}
                </button>
                {decisionHistoryById[decision.id]?.length ? (
                  <div className="mt-2 space-y-1 rounded-lg border border-(--border) bg-(--bg-muted) p-2 text-[11px] text-(--text-secondary)">
                    {decisionHistoryById[decision.id].map((item) => (
                      <p key={item.id}>
                        {new Date(item.createdAt).toLocaleString("pt-BR")} | {item.previousStatus ?? "inicio"} -&gt; {item.newStatus} | {item.source}
                        {item.note ? ` | ${item.note}` : ""}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      </ProjectRoutine>
    </section>
  );
}
