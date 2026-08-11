"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { DailySnapshot, DailyTask } from "@/services/daily-service";
import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

type ColumnKey = "todo" | "doing" | "done";
type TaskDetail = {
  card: DailyTask & { columnId: string };
  dailySelected: boolean;
  comments: Array<{ id: string; authorEmail: string; content: string; createdAt: string }>;
};
type TaskBoard = { columns: Array<{ id: string; key: ColumnKey; cards: Array<{ id: string }> }> };
type TaskForm = {
  title: string;
  description: string;
  priority: DailyTask["priority"];
  responsible: string;
  dueDate: string;
  columnId: string;
  dailySelected: boolean;
};

const STATUS_LABEL: Record<DailyTask["status"], string> = {
  aberta: "TO DO",
  em_andamento: "DOING",
  concluida: "DONE",
};

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  priority: "media",
  responsible: "",
  dueDate: "",
  columnId: "",
  dailySelected: true,
};

export function DailyClient() {
  const [daily, setDaily] = useState<DailySnapshot>({ tasks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  async function loadDaily() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/daily", { headers: getClientAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao carregar a Daily.");
      setDaily(payload.data as DailySnapshot);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar a Daily.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDaily();
  }, []);

  async function openTask(task: DailyTask) {
    setSelectedTask(task);
    setTaskDetail(null);
    setBoard(null);
    setDrawerLoading(true);
    setError(null);
    try {
      const [detailResponse, boardResponse] = await Promise.all([
        fetch(`/api/tasks/${task.id}/details`, { headers: getClientAuthHeaders() }),
        fetch(`/api/projects/${task.projectId}/tasks`, { headers: getClientAuthHeaders() }),
      ]);
      const detailPayload = await detailResponse.json();
      const boardPayload = await boardResponse.json();
      if (!detailResponse.ok) throw new Error(detailPayload?.error || "Falha ao carregar o card.");
      if (!boardResponse.ok) throw new Error(boardPayload?.error || "Falha ao carregar o Kanban.");

      const detail = detailPayload.data as TaskDetail;
      const nextBoard = boardPayload.data as TaskBoard;
      setTaskDetail(detail);
      setBoard(nextBoard);
      setForm({
        title: detail.card.title,
        description: detail.card.description,
        priority: detail.card.priority,
        responsible: detail.card.responsible ?? "",
        dueDate: detail.card.dueDate?.slice(0, 10) ?? "",
        columnId: detail.card.columnId,
        dailySelected: detail.dailySelected,
      });
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Falha ao abrir o card.");
      setSelectedTask(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function saveTask() {
    if (!selectedTask || !taskDetail || saving || !form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const coreResponse = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          responsible: form.responsible.trim() || null,
          dueDate: form.dueDate || null,
        }),
      });
      const corePayload = await coreResponse.json();
      if (!coreResponse.ok) throw new Error(corePayload?.error || "Falha ao salvar o card.");

      if (form.columnId && form.columnId !== taskDetail.card.columnId) {
        const targetColumn = board?.columns.find((column) => column.id === form.columnId);
        const moveResponse = await fetch(`/api/tasks/${selectedTask.id}`, {
          method: "PATCH",
          headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ columnId: form.columnId, position: targetColumn?.cards.length ?? 0 }),
        });
        const movePayload = await moveResponse.json();
        if (!moveResponse.ok) throw new Error(movePayload?.error || "Falha ao mover o card no Kanban.");
      }

      if (form.dailySelected !== taskDetail.dailySelected) {
        const selectionResponse = await fetch(`/api/tasks/${selectedTask.id}/details`, {
          method: "POST",
          headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ action: "set_daily_selection", selected: form.dailySelected }),
        });
        const selectionPayload = await selectionResponse.json();
        if (!selectionResponse.ok) throw new Error(selectionPayload?.error || "Falha ao atualizar o vinculo com a Daily.");
      }

      setSelectedTask(null);
      await loadDaily();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar o card.");
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    if (!selectedTask || !commentText.trim() || commentSaving) return;
    setCommentSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}/details`, {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "add_comment", content: commentText.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Falha ao registrar o comentario.");
      setTaskDetail(payload.data as TaskDetail);
      setCommentText("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Falha ao registrar o comentario.");
    } finally {
      setCommentSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageIntro eyebrow="Workspace ativo" title="Daily do projeto" description="Cards selecionados no Kanban para orientar o trabalho de hoje." />

      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel>Plano de trabalho</SectionLabel>
            <h3 className="mt-2 text-base font-semibold text-(--text-primary)">Atividades da Daily</h3>
          </div>
          <button type="button" onClick={() => void loadDaily()} className="workspace-button-secondary px-3 py-2 text-xs">Atualizar</button>
        </div>
        {loading ? <p className="mt-3 text-sm text-(--text-secondary)">Carregando atividades selecionadas...</p> : null}
        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {!loading && !error && daily.tasks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-(--border) bg-(--bg-muted) p-5 text-sm text-(--text-secondary)">
            Nenhuma atividade foi selecionada para a Daily. Abra um card no Kanban e marque &quot;Incluir na Daily&quot;.
          </div>
        ) : null}
        {!loading && daily.tasks.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {daily.tasks.map((task) => (
              <button key={task.id} type="button" onClick={() => void openTask(task)} className="rounded-xl border border-(--border) bg-(--bg-muted) p-4 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-semibold text-(--text-primary)">{task.title}</h4>
                  <span className="workspace-pill">{STATUS_LABEL[task.status]}</span>
                </div>
                {task.description ? <p className="mt-2 text-sm leading-6 text-(--text-secondary)">{task.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-(--text-secondary)">
                  <span>Prioridade: {task.priority}</span>
                  {task.responsible ? <span>Responsavel: {task.responsible}</span> : null}
                  {task.dueDate ? <span>Prazo: {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}</span> : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </SurfaceCard>

      {selectedTask ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Fechar edicao" onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-black/30" />
          <aside className="relative ml-auto h-dvh w-full max-w-2xl overflow-y-auto border-l border-(--border) bg-(--bg-surface) p-5 shadow-2xl sm:p-6">
            {drawerLoading ? <p className="text-sm text-(--text-secondary)">Carregando card...</p> : null}
            {!drawerLoading && taskDetail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--border) pb-4">
                  <div><SectionLabel>Card da Daily</SectionLabel><h3 className="mt-2 text-lg font-semibold text-(--text-primary)">Atualizar atividade</h3></div>
                  <button type="button" onClick={() => setSelectedTask(null)} className="workspace-button-secondary px-3 py-2 text-xs">Fechar</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Titulo<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="workspace-input mt-1 w-full" /></label>
                  <label className="text-xs font-medium text-(--text-primary)">Prioridade<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as DailyTask["priority"] }))} className="workspace-select mt-1 w-full"><option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Critica</option></select></label>
                  <label className="text-xs font-medium text-(--text-primary)">Coluna do Kanban<select value={form.columnId} onChange={(event) => setForm((current) => ({ ...current, columnId: event.target.value }))} className="workspace-select mt-1 w-full">{board?.columns.map((column) => <option key={column.id} value={column.id}>{column.key.toUpperCase()}</option>)}</select></label>
                  <label className="text-xs font-medium text-(--text-primary)">Responsavel<input value={form.responsible} onChange={(event) => setForm((current) => ({ ...current, responsible: event.target.value }))} className="workspace-input mt-1 w-full" /></label>
                  <label className="text-xs font-medium text-(--text-primary)">Data limite<input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="workspace-input mt-1 w-full" /></label>
                  <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Orientacao e descricao<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="workspace-input mt-1 min-h-36 w-full" /></label>
                </div>
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-(--border) bg-(--bg-muted) px-3 py-2 text-sm text-(--text-primary)"><input type="checkbox" checked={form.dailySelected} onChange={(event) => setForm((current) => ({ ...current, dailySelected: event.target.checked }))} />Manter vinculado a Daily</label>
                <div className="space-y-3 rounded-xl border border-(--border) bg-(--bg-muted) p-4">
                  <div>
                    <SectionLabel>Comentarios</SectionLabel>
                    <p className="mt-1 text-sm text-(--text-secondary)">Registre alinhamentos e atualizacoes. Eles tambem aparecem no card do Kanban.</p>
                  </div>
                  {taskDetail.comments.map((comment) => (
                    <article key={comment.id} className="rounded-lg border border-(--border) bg-white px-3 py-3 text-sm">
                      <p className="font-medium text-(--text-primary)">{comment.authorEmail}</p>
                      <p className="mt-1 whitespace-pre-wrap text-(--text-primary)">{comment.content}</p>
                      <p className="mt-2 text-xs text-(--text-secondary)">{new Date(comment.createdAt).toLocaleString("pt-BR")}</p>
                    </article>
                  ))}
                  <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Registrar comentario no card..." className="workspace-input min-h-24 w-full" />
                  <button type="button" onClick={() => void addComment()} disabled={commentSaving || !commentText.trim()} className="workspace-button-secondary px-3 py-2 text-sm">{commentSaving ? "Registrando..." : "Adicionar comentario"}</button>
                </div>
                <p className="text-xs leading-5 text-(--text-secondary)">Salvar atualiza este mesmo card no Kanban. Se alterar a coluna, o card tambem sera movido no quadro.</p>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedTask(null)} className="workspace-button-secondary px-4 py-2 text-sm">Cancelar</button><button type="button" onClick={() => void saveTask()} disabled={saving || !form.title.trim()} className="workspace-button-primary px-4 py-2 text-sm">{saving ? "Salvando..." : "Salvar card"}</button></div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
