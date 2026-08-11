"use client";

import { useEffect, useMemo, useState } from "react";
import { getClientAuthEmail, getClientAuthHeaders } from "@/lib/client-auth";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";

type ProjectSummary = {
  id: string;
  name: string;
  status: string;
};

type TaskCard = {
  id: string;
  title: string;
  description: string;
  priority: "baixa" | "media" | "alta" | "critica";
  status: "aberta" | "em_andamento" | "concluida";
  responsible: string | null;
  dueDate: string | null;
  position: number;
  columnId: string;
  columnKey: "todo" | "doing" | "done";
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
};

type TaskColumn = {
  id: string;
  key: "todo" | "doing" | "done";
  title: string;
  position: number;
  cards: TaskCard[];
};

type TaskBoard = {
  id: string;
  projectId: string;
  name: string;
  columns: TaskColumn[];
};

type AccessRole = "owner" | "editor" | "viewer" | "none";

type TaskLabel = { id: string; name: string; color: string };
type TaskMember = { id: string; memberEmail: string; role: string };
type TaskChecklistItem = { id: string; content: string; done: boolean };
type TaskChecklist = { id: string; title: string; items: TaskChecklistItem[] };
type TaskComment = { id: string; authorEmail: string; content: string; createdAt: string };
type TaskAttachment = { id: string; fileName: string; fileUrl: string; mimeType: string };
type TaskActivity = { id: string; actionType: string; actionDetail: string; actorEmail: string; createdAt: string };

type TaskDetail = {
  card: TaskCard;
  accessRole: AccessRole;
  dailySelected: boolean;
  labels: TaskLabel[];
  members: TaskMember[];
  checklists: TaskChecklist[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activity: TaskActivity[];
};

export default function ActivitiesPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [accessRole, setAccessRole] = useState<AccessRole>("none");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailForm, setDetailForm] = useState({
    title: "",
    description: "",
    priority: "media" as "baixa" | "media" | "alta" | "critica",
    dueDate: "",
    responsible: "",
  });
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#334155");
  const [memberEmail, setMemberEmail] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [checklistItemInput, setChecklistItemInput] = useState<Record<string, string>>({});

  const canEdit = accessRole === "owner" || accessRole === "editor";
  const canEditDetail = taskDetail?.accessRole === "owner" || taskDetail?.accessRole === "editor";
  const currentUserEmail = getClientAuthEmail()?.toLowerCase() ?? "";

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );

  async function loadProjects() {
    const response = await fetch("/api/projects", { headers: getClientAuthHeaders() });
    if (!response.ok) {
      setProjects([]);
      setActiveProjectId(null);
      return;
    }

    const payload = await response.json();
    const items = (payload?.data ?? []) as ProjectSummary[];
    setProjects(items);
    setActiveProjectId(payload?.meta?.activeProjectId ?? items[0]?.id ?? null);
  }

  async function loadBoard(projectId: string) {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar quadro.");
      setBoard((payload?.data ?? null) as TaskBoard | null);
      setAccessRole((payload?.meta?.accessRole ?? "none") as AccessRole);
    } catch (error) {
      setBoard(null);
      setAccessRole("none");
      setStatus(error instanceof Error ? error.message : "Erro ao carregar quadro.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskDetail(taskId: string) {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/details`, {
        headers: getClientAuthHeaders(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao carregar detalhes do card.");
      const detail = payload?.data as TaskDetail;
      setTaskDetail(detail);
      setDetailForm({
        title: detail.card.title ?? "",
        description: detail.card.description ?? "",
        priority: detail.card.priority ?? "media",
        dueDate: detail.card.dueDate ? detail.card.dueDate.slice(0, 10) : "",
        responsible: detail.card.responsible ?? "",
      });
    } catch (error) {
      setTaskDetail(null);
      setStatus(error instanceof Error ? error.message : "Erro ao carregar detalhes do card.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function applyDetailAction(payload: Record<string, unknown>) {
    if (!selectedTaskId) return;
    setStatus(null);
    const response = await fetch(`/api/tasks/${selectedTaskId}/details`, {
      method: "POST",
      headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || "Falha ao atualizar card.");

    const detail = body?.data as TaskDetail;
    setTaskDetail(detail);
    setDetailForm({
      title: detail.card.title ?? "",
      description: detail.card.description ?? "",
      priority: detail.card.priority ?? "media",
      dueDate: detail.card.dueDate ? detail.card.dueDate.slice(0, 10) : "",
      responsible: detail.card.responsible ?? "",
    });
    if (activeProjectId) await loadBoard(activeProjectId);
  }

  useEffect(() => {
    async function bootstrap() {
      await loadProjects();
    }
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    setSelectedTaskId(null);
    setTaskDetail(null);
    void loadBoard(activeProjectId);
  }, [activeProjectId]);

  async function handleActivateProject(projectId: string) {
    setActiveProjectId(projectId);
    try {
      await fetch("/api/projects/active", {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ projectId }),
      });
    } catch {
      // no-op
    }
  }

  async function handleCreateTask() {
    if (!activeProjectId || !newTaskTitle.trim() || !canEdit || creatingTask) return;
    setCreatingTask(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/tasks`, {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim(),
          columnKey: "todo",
          priority: "media",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao criar atividade.");
      setNewTaskTitle("");
      setNewTaskDescription("");
      await loadBoard(activeProjectId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao criar atividade.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function moveTask(taskId: string, targetColumnId: string, targetPosition: number) {
    if (!canEdit) return;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          columnId: targetColumnId,
          position: targetPosition,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Falha ao mover atividade.");
      if (activeProjectId) await loadBoard(activeProjectId);
      if (selectedTaskId === taskId) await loadTaskDetail(taskId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao mover atividade.");
    }
  }

  function handleDragStart(taskId: string) {
    setDraggingTaskId(taskId);
  }

  async function handleDrop(column: TaskColumn) {
    if (!draggingTaskId || !canEdit) return;
    const nextPosition = column.cards.length;
    await moveTask(draggingTaskId, column.id, nextPosition);
    setDraggingTaskId(null);
  }

  function closeTaskDrawer() {
    setSelectedTaskId(null);
    setTaskDetail(null);
  }

  useEffect(() => {
    if (!selectedTaskId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTaskDrawer();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedTaskId]);

  return (
    <section className="space-y-4">
      <PageIntro
        eyebrow="7Commander"
        title="Atividades operacionais"
        description="Quadro Kanban por projeto com cards operacionais, responsáveis, checklists, anexos e histórico completo."
        aside={
          <>
            <StatusPill tone="accent">{projects.length} projetos</StatusPill>
            <StatusPill tone="success">{board?.columns.reduce((total, column) => total + column.cards.length, 0) ?? 0} cards</StatusPill>
            <button
              type="button"
              onClick={() => activeProjectId && void loadBoard(activeProjectId)}
              className="workspace-button-secondary"
            >
              Atualizar
            </button>
          </>
        }
      />

      <SurfaceCard>
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>Projeto ativo</SectionLabel>
          <select
            value={activeProjectId ?? ""}
            onChange={(event) => void handleActivateProject(event.target.value)}
            className="workspace-select max-w-72"
          >
            <option value="">Selecione um projeto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.status})
              </option>
            ))}
          </select>
          <span className="text-xs text-(--text-secondary)">
            {selectedProject ? `Projeto: ${selectedProject.name}` : "Sem projeto selecionado"}
          </span>
          <span className="workspace-pill">
            Acesso: {accessRole}
          </span>
        </div>
      </SurfaceCard>

      {canEdit ? (
        <SurfaceCard>
          <SectionLabel>Nova atividade</SectionLabel>
          <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Criar card operacional</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Titulo da atividade"
              className="workspace-input"
            />
            <input
              value={newTaskDescription}
              onChange={(event) => setNewTaskDescription(event.target.value)}
              placeholder="Descricao curta (opcional)"
              className="workspace-input"
            />
            <button
              type="button"
              onClick={() => void handleCreateTask()}
              disabled={creatingTask}
              className="workspace-button-primary"
            >
              {creatingTask ? "Criando..." : "Criar card"}
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      {status ? (
        <p className="workspace-card px-3 py-2 text-sm text-(--text-primary)">
          {status}
        </p>
      ) : null}

      {loading ? (
        <article className="workspace-card p-4 text-sm text-(--text-secondary)">
          Carregando quadro...
        </article>
      ) : board ? (
        <div className="grid gap-3 md:grid-cols-3">
          {board.columns.map((column) => (
            <article
              key={column.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(column)}
              className="workspace-card min-h-72 p-3"
            >
              <SectionLabel>{column.title}</SectionLabel>
              <div className="mt-3 space-y-2">
                {column.cards.length === 0 ? (
                  <p className="workspace-empty-state px-3 py-4 text-center text-xs">
                    Sem cards
                  </p>
                ) : (
                  column.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      draggable={canEdit}
                      onDragStart={() => handleDragStart(card.id)}
                      onClick={() => {
                        setSelectedTaskId(card.id);
                        void loadTaskDetail(card.id);
                      }}
                      className="workspace-card-muted w-full cursor-grab px-3 py-3 text-left text-sm"
                    >
                      <p className="font-medium text-(--text-primary)">{card.title}</p>
                      {card.labels.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {card.labels.map((label) => (
                            <span
                              key={label.id}
                              className="inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                              style={{ backgroundColor: label.color }}
                              title={label.name}
                            >
                              <span className="truncate">{label.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {card.description ? (
                        <p className="mt-1 text-xs text-(--text-secondary)">{card.description}</p>
                      ) : null}
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-(--text-secondary)">
                        {card.priority} | {card.status}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="workspace-empty-state text-sm">
          Selecione um projeto para carregar o quadro.
        </article>
      )}

      {selectedTaskId ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar detalhes"
            onClick={closeTaskDrawer}
            className="absolute inset-0 bg-black/25"
          />
          <aside className="relative ml-auto h-dvh w-full max-w-4xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-4 shadow-2xl sm:p-6">
            {detailLoading ? (
              <p className="text-sm text-(--text-secondary)">Carregando detalhes...</p>
            ) : taskDetail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--border) pb-4">
                  <h3 className="min-w-0 text-lg font-semibold text-(--text-primary)">Card: {taskDetail.card.title}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="workspace-pill">
                      {taskDetail.accessRole}
                    </span>
                    <button
                      type="button"
                      onClick={closeTaskDrawer}
                      className="workspace-button-secondary px-3 py-2 text-xs"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <input
                    value={detailForm.title}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  />
                  <input
                    value={detailForm.responsible}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, responsible: event.target.value }))}
                    placeholder="Responsavel (email)"
                    className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  />
                  <select
                    value={detailForm.priority}
                    onChange={(event) =>
                      setDetailForm((prev) => ({
                        ...prev,
                        priority: event.target.value as "baixa" | "media" | "alta" | "critica",
                      }))
                    }
                    className="w-full rounded-lg border border-(--border) bg-white px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  >
                    <option value="baixa">baixa</option>
                    <option value="media">media</option>
                    <option value="alta">alta</option>
                    <option value="critica">critica</option>
                  </select>
                  <input
                    type="date"
                    value={detailForm.dueDate}
                    onChange={(event) => setDetailForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                  />
                </div>
                <textarea
                  value={detailForm.description}
                  onChange={(event) => setDetailForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Descricao detalhada"
                  className="min-h-24 w-full rounded-lg border border-(--border) px-3 py-2 text-sm outline-none focus:border-(--accent)"
                />
                {canEditDetail ? (
                  <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-(--border) bg-(--bg-muted) px-3 py-2 text-sm text-(--text-primary)">
                    <input
                      type="checkbox"
                      checked={taskDetail.dailySelected}
                      onChange={(event) => void applyDetailAction({ action: "set_daily_selection", selected: event.target.checked })}
                    />
                    Incluir na Daily
                  </label>
                ) : null}
                {canEditDetail ? (
                  <button
                    type="button"
                    onClick={() =>
                      void applyDetailAction({
                        action: "update_core",
                        title: detailForm.title,
                        description: detailForm.description,
                        priority: detailForm.priority,
                        dueDate: detailForm.dueDate || null,
                        responsible: detailForm.responsible || null,
                      })
                    }
                    className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white"
                  >
                    Salvar card
                  </button>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="min-w-0 space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Etiquetas</p>
                    <div className="flex flex-wrap gap-2">
                      {taskDetail.labels.map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                          {canEditDetail ? (
                            <button
                              type="button"
                              onClick={() => void applyDetailAction({ action: "remove_label", labelId: label.id })}
                              className="text-[11px]"
                            >
                              x
                            </button>
                          ) : null}
                        </span>
                      ))}
                    </div>
                    {canEditDetail ? (
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_72px_auto]">
                        <input
                          value={labelName}
                          onChange={(event) => setLabelName(event.target.value)}
                          placeholder="Nome da etiqueta"
                          className="rounded-lg border border-(--border) px-3 py-2 text-xs"
                        />
                        <input
                          type="color"
                          value={labelColor}
                          onChange={(event) => setLabelColor(event.target.value)}
                          className="h-9 w-full rounded-lg border border-(--border)"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void applyDetailAction({
                              action: "add_label",
                              name: labelName,
                              color: labelColor,
                            }).then(() => setLabelName(""))
                          }
                          className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white"
                        >
                          Adicionar
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Membros</p>
                    {taskDetail.members.map((member) => (
                      <div key={member.id} className="flex min-w-0 items-center justify-between gap-2 rounded border border-(--border) bg-white px-2 py-1 text-xs">
                        <span className="min-w-0 truncate">{member.memberEmail}</span>
                        {canEditDetail ? (
                          <button
                            type="button"
                            onClick={() => void applyDetailAction({ action: "remove_member", memberId: member.id })}
                            className="text-(--text-secondary)"
                          >
                            remover
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {canEditDetail ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={memberEmail}
                          onChange={(event) => setMemberEmail(event.target.value)}
                          placeholder="membro@empresa.com"
                          className="min-w-0 flex-1 rounded-lg border border-(--border) px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void applyDetailAction({ action: "add_member", memberEmail }).then(() => setMemberEmail(""))
                          }
                          className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white"
                        >
                          Adicionar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Checklist</p>
                  {taskDetail.checklists.map((checklist) => (
                    <div key={checklist.id} className="rounded border border-(--border) bg-white p-2">
                      <p className="text-xs font-medium text-(--text-primary)">{checklist.title}</p>
                      <div className="mt-2 space-y-1">
                        {checklist.items.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-xs text-(--text-primary)">
                            <input
                              type="checkbox"
                              checked={item.done}
                              disabled={!canEditDetail}
                              onChange={(event) =>
                                void applyDetailAction({
                                  action: "toggle_checklist_item",
                                  itemId: item.id,
                                  done: event.target.checked,
                                })
                              }
                            />
                            <span>{item.content}</span>
                          </label>
                        ))}
                      </div>
                      {canEditDetail ? (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            value={checklistItemInput[checklist.id] ?? ""}
                            onChange={(event) =>
                              setChecklistItemInput((prev) => ({ ...prev, [checklist.id]: event.target.value }))
                            }
                            placeholder="Novo item"
                            className="min-w-0 flex-1 rounded-lg border border-(--border) px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void applyDetailAction({
                                action: "add_checklist_item",
                                checklistId: checklist.id,
                                content: checklistItemInput[checklist.id] ?? "",
                              }).then(() =>
                                setChecklistItemInput((prev) => ({ ...prev, [checklist.id]: "" })),
                              )
                            }
                            className="rounded bg-(--accent) px-2 py-1 text-xs text-white"
                          >
                            +
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {canEditDetail ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={checklistTitle}
                        onChange={(event) => setChecklistTitle(event.target.value)}
                        placeholder="Titulo da checklist"
                        className="min-w-0 flex-1 rounded-lg border border-(--border) px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void applyDetailAction({ action: "add_checklist", title: checklistTitle }).then(() =>
                            setChecklistTitle(""),
                          )
                        }
                        className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white"
                      >
                        Criar
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="min-w-0 space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Comentarios</p>
                    {taskDetail.comments.map((comment) => (
                      <div key={comment.id} className="min-w-0 rounded border border-(--border) bg-white px-3 py-3 text-xs">
                        <p className="font-medium text-(--text-primary)">{comment.authorEmail}</p>
                        {editingCommentId === comment.id ? (
                          <>
                            <textarea value={editingCommentText} onChange={(event) => setEditingCommentText(event.target.value)} className="mt-2 min-h-16 w-full rounded border border-(--border) px-2 py-1 text-xs" />
                            <div className="mt-2 flex gap-2">
                              <button type="button" onClick={() => void applyDetailAction({ action: "update_comment", commentId: comment.id, content: editingCommentText }).then(() => { setEditingCommentId(null); setEditingCommentText(""); })} className="rounded bg-(--accent) px-2 py-1 text-xs font-medium text-white">Salvar</button>
                              <button type="button" onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }} className="rounded border border-(--border) px-2 py-1 text-xs">Cancelar</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="mt-1 text-(--text-primary)">{comment.content}</p>
                            {canEditDetail && currentUserEmail === comment.authorEmail.toLowerCase() ? (
                              <div className="mt-2 flex gap-2">
                                <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }} className="text-xs font-medium text-(--accent)">Editar</button>
                                <button type="button" onClick={() => { if (window.confirm("Excluir este comentario?")) void applyDetailAction({ action: "delete_comment", commentId: comment.id }); }} className="text-xs font-medium text-red-700">Excluir</button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ))}
                    {canEditDetail ? (
                      <>
                        <textarea
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          placeholder="Novo comentario"
                          className="min-h-16 w-full rounded-lg border border-(--border) px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void applyDetailAction({ action: "add_comment", content: commentText }).then(() =>
                              setCommentText(""),
                            )
                          }
                          className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white"
                        >
                          Comentar
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="min-w-0 space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Anexos</p>
                    {taskDetail.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded border border-(--border) bg-white px-2 py-2 text-xs text-(--text-primary)"
                      >
                        {attachment.fileName}
                      </a>
                    ))}
                    {canEditDetail ? (
                      <>
                        <input
                          value={attachmentName}
                          onChange={(event) => setAttachmentName(event.target.value)}
                          placeholder="Nome do anexo"
                          className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs"
                        />
                        <input
                          value={attachmentUrl}
                          onChange={(event) => setAttachmentUrl(event.target.value)}
                          placeholder="URL do anexo"
                          className="w-full rounded-lg border border-(--border) px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void applyDetailAction({
                              action: "add_attachment",
                              fileName: attachmentName,
                              fileUrl: attachmentUrl,
                            }).then(() => {
                              setAttachmentName("");
                              setAttachmentUrl("");
                            })
                          }
                          className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-white"
                        >
                          Registrar anexo
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">Historico de atividade</p>
                  {taskDetail.activity.map((entry) => (
                    <p key={entry.id} className="rounded border border-(--border) bg-white px-2 py-1 text-xs text-(--text-primary)">
                      {new Date(entry.createdAt).toLocaleString("pt-BR")} | {entry.actorEmail} | {entry.actionDetail}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-(--text-secondary)">Selecione um card para ver detalhes.</p>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
