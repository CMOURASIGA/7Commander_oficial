"use client";

import type { KairosCore } from "@/components/kairos/use-kairos-core";

/**
 * Modal "Direcionar resposta" (Decisao / Risco / Conhecimento / Atividade),
 * compartilhado entre /chat, /voice e o painel do Kairos — a mesma
 * capacidade de transformar uma resposta em dado operacional, em qualquer
 * uma das tres superficies.
 */
export function KairosSaveDialog({ core }: { core: KairosCore }) {
  const { saveDialog } = core;
  if (!saveDialog) return null;

  const isSaving =
    core.decisionLoadingId === saveDialog.message.id ||
    core.riskLoadingId === saveDialog.message.id ||
    core.knowledgeLoadingId === saveDialog.message.id ||
    core.taskLoadingId === saveDialog.message.id;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="kairos-save-dialog-title" className="workspace-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--accent)">Registro no projeto</p>
            <h2 id="kairos-save-dialog-title" className="mt-1 text-lg font-semibold text-(--text-primary)">
              {saveDialog.kind === "choose"
                ? "Direcionar resposta do Kairos"
                : saveDialog.kind === "decision"
                  ? "Registrar decisao"
                  : saveDialog.kind === "risk"
                    ? "Registrar risco"
                    : saveDialog.kind === "knowledge"
                      ? "Guardar como conhecimento"
                      : "Criar atividade no Kanban"}
            </h2>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Revise e complete as informacoes antes de salvar em {core.selectedProject?.name ?? "este projeto"}.
            </p>
          </div>
          <button type="button" onClick={core.closeSaveDialog} className="workspace-button-secondary px-3 py-2 text-xs">Fechar</button>
        </div>

        {saveDialog.kind === "choose" ? (
          <div className="mt-6">
            <p className="text-sm font-medium text-(--text-primary)">Como deseja usar esta resposta?</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <button type="button" onClick={() => core.openSaveDialog("decision", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--accent-soft) text-sm font-bold text-(--accent)">D</span>
                <span className="block">
                  <span className="block text-base font-semibold text-(--text-primary)">Decisao</span>
                  <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Formalize uma escolha, sua justificativa e o impacto esperado.</span>
                </span>
              </button>
              <button type="button" onClick={() => core.openSaveDialog("risk", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">R</span>
                <span className="block">
                  <span className="block text-base font-semibold text-(--text-primary)">Risco</span>
                  <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Registre impacto, probabilidade, responsavel e plano de mitigacao.</span>
                </span>
              </button>
              <button type="button" onClick={() => core.openSaveDialog("knowledge", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">C</span>
                <span className="block">
                  <span className="block text-base font-semibold text-(--text-primary)">Conhecimento</span>
                  <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Guarde esta resposta como referencia e contexto permanente do projeto.</span>
                </span>
              </button>
              <button type="button" onClick={() => core.openSaveDialog("task", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm font-bold text-sky-700">K</span>
                <span className="block">
                  <span className="block text-base font-semibold text-(--text-primary)">Atividade no Kanban</span>
                  <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Crie um card para executar e acompanhar o trabalho no quadro.</span>
                </span>
              </button>
            </div>
          </div>
        ) : saveDialog.kind === "decision" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Titulo da decisao
              <input
                value={core.decisionForm.title}
                onChange={(event) => {
                  core.setDecisionForm((prev) => ({ ...prev, title: event.target.value }));
                  if (core.decisionTitleError) core.setDecisionTitleError(null);
                }}
                aria-invalid={Boolean(core.decisionTitleError)}
                className={`workspace-input mt-1 w-full ${core.decisionTitleError ? "field-invalid" : ""}`}
              />
              {core.decisionTitleError ? <p className="field-error">{core.decisionTitleError}</p> : null}
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Contexto
              <textarea value={core.decisionForm.context} onChange={(event) => core.setDecisionForm((prev) => ({ ...prev, context: event.target.value }))} className="workspace-input mt-1 min-h-24 w-full" />
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Impacto esperado
              <textarea value={core.decisionForm.impact} onChange={(event) => core.setDecisionForm((prev) => ({ ...prev, impact: event.target.value }))} className="workspace-input mt-1 min-h-24 w-full" />
            </label>
            <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Artefato relacionado (opcional)
              <input value={core.decisionForm.artifactId} onChange={(event) => core.setDecisionForm((prev) => ({ ...prev, artifactId: event.target.value }))} className="workspace-input mt-1 w-full" />
            </label>
          </div>
        ) : saveDialog.kind === "risk" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Titulo do risco
              <input
                value={core.riskForm.title}
                onChange={(event) => {
                  core.setRiskForm((prev) => ({ ...prev, title: event.target.value }));
                  if (core.riskTitleError) core.setRiskTitleError(null);
                }}
                aria-invalid={Boolean(core.riskTitleError)}
                className={`workspace-input mt-1 w-full ${core.riskTitleError ? "field-invalid" : ""}`}
              />
              {core.riskTitleError ? <p className="field-error">{core.riskTitleError}</p> : null}
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Impacto
              <input value={core.riskForm.impact} onChange={(event) => core.setRiskForm((prev) => ({ ...prev, impact: event.target.value }))} className="workspace-input mt-1 w-full" />
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Probabilidade
              <input value={core.riskForm.probability} onChange={(event) => core.setRiskForm((prev) => ({ ...prev, probability: event.target.value }))} className="workspace-input mt-1 w-full" />
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Responsavel
              <input value={core.riskForm.owner} onChange={(event) => core.setRiskForm((prev) => ({ ...prev, owner: event.target.value }))} className="workspace-input mt-1 w-full" />
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Plano de mitigacao
              <input value={core.riskForm.mitigation} onChange={(event) => core.setRiskForm((prev) => ({ ...prev, mitigation: event.target.value }))} className="workspace-input mt-1 w-full" />
            </label>
          </div>
        ) : saveDialog.kind === "knowledge" ? (
          <div className="mt-5 grid gap-3">
            <label className="text-xs font-medium text-(--text-primary)">Titulo do conhecimento
              <input
                value={core.knowledgeForm.title}
                onChange={(event) => {
                  core.setKnowledgeForm((prev) => ({ ...prev, title: event.target.value }));
                  if (core.knowledgeTitleError) core.setKnowledgeTitleError(null);
                }}
                aria-invalid={Boolean(core.knowledgeTitleError)}
                className={`workspace-input mt-1 w-full ${core.knowledgeTitleError ? "field-invalid" : ""}`}
              />
              {core.knowledgeTitleError ? <p className="field-error">{core.knowledgeTitleError}</p> : null}
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Categoria
              <input value={core.knowledgeForm.category} onChange={(event) => core.setKnowledgeForm((prev) => ({ ...prev, category: event.target.value }))} className="workspace-input mt-1 w-full" />
            </label>
            <label className="text-xs font-medium text-(--text-primary)">Conteudo que sera guardado
              <textarea
                value={core.knowledgeForm.content}
                onChange={(event) => {
                  core.setKnowledgeForm((prev) => ({ ...prev, content: event.target.value }));
                  if (core.knowledgeContentError) core.setKnowledgeContentError(null);
                }}
                aria-invalid={Boolean(core.knowledgeContentError)}
                className={`workspace-input mt-1 min-h-48 w-full ${core.knowledgeContentError ? "field-invalid" : ""}`}
              />
              {core.knowledgeContentError ? <p className="field-error">{core.knowledgeContentError}</p> : null}
            </label>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-(--border) bg-(--accent-ghost) px-4 py-3">
              <p className="text-sm font-semibold text-(--text-primary)">{core.taskDrafts.length} {core.taskDrafts.length === 1 ? "atividade identificada" : "atividades identificadas"}</p>
              <p className="mt-1 text-xs text-(--text-secondary)">Selecione e ajuste os cards que devem ser criados no Kanban.</p>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {core.taskDrafts.map((task, index) => (
                <div key={task.id} className="rounded-xl border border-(--border) bg-white p-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
                    <input type="checkbox" checked={task.selected} onChange={(event) => core.setTaskDrafts((prev) => prev.map((item) => item.id === task.id ? { ...item, selected: event.target.checked } : item))} />
                    Atividade {index + 1}
                  </label>
                  <input value={task.title} disabled={!task.selected} onChange={(event) => core.setTaskDrafts((prev) => prev.map((item) => item.id === task.id ? { ...item, title: event.target.value } : item))} className="workspace-input mt-2 w-full" aria-label={`Titulo da atividade ${index + 1}`} />
                  <textarea value={task.description} disabled={!task.selected} onChange={(event) => core.setTaskDrafts((prev) => prev.map((item) => item.id === task.id ? { ...item, description: event.target.value } : item))} className="workspace-input mt-2 min-h-20 w-full" aria-label={`Descricao da atividade ${index + 1}`} />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-(--text-primary)">Coluna do Kanban
                <select value={core.taskForm.columnKey} onChange={(event) => core.setTaskForm((prev) => ({ ...prev, columnKey: event.target.value }))} className="workspace-select mt-1 w-full">
                  <option value="todo">TO DO</option>
                  <option value="doing">DOING</option>
                  <option value="done">DONE</option>
                </select>
              </label>
              <label className="text-xs font-medium text-(--text-primary)">Prioridade
                <select value={core.taskForm.priority} onChange={(event) => core.setTaskForm((prev) => ({ ...prev, priority: event.target.value }))} className="workspace-select mt-1 w-full">
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </label>
              <label className="text-xs font-medium text-(--text-primary)">Data limite (opcional)
                <input type="date" value={core.taskForm.dueDate} onChange={(event) => core.setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="workspace-input mt-1 w-full" />
              </label>
            </div>
          </div>
        )}

        {saveDialog.kind !== "choose" ? (
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={core.closeSaveDialog} className="workspace-button-secondary px-4 py-2 text-sm">Cancelar</button>
            <button
              type="button"
              onClick={() => void (
                saveDialog.kind === "decision" ? core.handleSaveDecision()
                  : saveDialog.kind === "risk" ? core.handleSaveRisk()
                    : saveDialog.kind === "knowledge" ? core.handleSaveKnowledge()
                      : core.handleSaveTask()
              )}
              disabled={isSaving}
              className="workspace-button-primary px-4 py-2 text-sm"
            >
              {isSaving ? "Salvando..." : "Confirmar e salvar"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
