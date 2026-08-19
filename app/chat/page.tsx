"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage, ConversationMeta } from "@/types/chat";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useToast } from "@/components/ui/toast";

type ProjectOption = { id: string; name: string; status: string };
type KairosProfileSummary = { icebreakers: string[] };
type SaveKind = "decision" | "risk" | "knowledge" | "task";
type SaveDialog = { kind: SaveKind | "choose"; message: ChatMessage } | null;
type TaskDraft = { id: string; title: string; description: string; selected: boolean };

function removeMarkdown(value: string): string {
  return value.replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
}

function getTaskDrafts(content: string): TaskDraft[] {
  const numberedItems = [...content.matchAll(/^\s*(\d+)[.)]\s+(.+)$/gm)];

  if (numberedItems.length > 1) {
    return numberedItems.map((item, index) => {
      const start = (item.index ?? 0) + item[0].length;
      const end = numberedItems[index + 1]?.index ?? content.length;
      const description = content.slice(start, end)
        .replace(/^\s*[-*]\s*/gm, "")
        .replace(/^\s*#{1,6}\s*/gm, "")
        .trim();

      return {
        id: `task-${item[1]}`,
        title: removeMarkdown(item[2]).replace(/[.:]\s*$/, "") || `Atividade ${item[1]}`,
        description: removeMarkdown(description),
        selected: true,
      };
    });
  }

  const boldItems = [...content.matchAll(/^\s*\*\*([^*\n]+)\*\*\s*$/gm)]
    .filter((item) => !/^(atividades|proximos passos|próximos passos|contexto|diagnostico|diagnóstico)\b/i.test(removeMarkdown(item[1]).replace(/:\s*$/, "")));

  if (boldItems.length > 1) {
    return boldItems.map((item, index) => {
      const start = (item.index ?? 0) + item[0].length;
      const end = boldItems[index + 1]?.index ?? content.length;
      const description = content.slice(start, end)
        .replace(/^\s*[-*]\s*/gm, "")
        .trim();

      return {
        id: `task-bold-${index + 1}`,
        title: removeMarkdown(item[1]).replace(/:\s*$/, "") || `Atividade ${index + 1}`,
        description: removeMarkdown(description),
        selected: true,
      };
    });
  }

  return [{
    id: "task-1",
    title: getSuggestedTitle(content, "task"),
    description: content,
    selected: true,
  }];
}

function getSuggestedTitle(content: string, kind: SaveKind): string {
  if (kind === "knowledge" || kind === "task") {
    return content.replace(/[#*_`]/g, "").replace(/\s+/g, " ").trim().slice(0, 180) || "Registro do Kairos";
  }

  const sectionPattern = kind === "decision"
    ? /(?:#{1,6}\s*decis(?:a|ã)o\s+(?:sugerida|proposta|para registrar)|decis(?:a|ã)o\s+proposta\s*:)[\s\S]*?(?=\n#{1,6}\s|$)/i
    : /(?:#{1,6}\s*risco\s+(?:identificado|sugerido|para registrar)|sugest(?:a|ã)o\s+de\s+risco\s+operacional\s*:|riscos?\s+identificados?\s*:)[\s\S]*?(?=\n#{1,6}\s|$)/i;
  const section = content.match(sectionPattern)?.[0] ?? "";
  const titled = section.match(/(?:titulo|título)\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (titled) return titled.replace(/^[-*]\s*/, "").slice(0, 180);

  const firstItem = section.match(/^\s*[-*]\s+(.+)$/m)?.[1]?.trim();
  return (firstItem || section.replace(/#{1,6}[^\n]*/, "").trim() || "Registro operacional").slice(0, 180);
}

function hasSaveSuggestion(content: string, kind: SaveKind): boolean {
  const pattern = kind === "decision"
    ? /(?:#{1,6}\s*decis(?:a|ã)o\s+(?:sugerida|proposta|para registrar)|decis(?:a|ã)o\s+proposta\s*:)/i
    : /(?:#{1,6}\s*risco\s+(?:identificado|sugerido|para registrar)|sugest(?:a|ã)o\s+de\s+risco\s+operacional\s*:|riscos?\s+identificados?\s*:)/i;
  return pattern.test(content);
}

function createConversationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

export default function ChatPage() {
  const { showToast } = useToast();
  const [conversationId, setConversationId] = useState<string>(createConversationId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [voiceLoadingId, setVoiceLoadingId] = useState<string | null>(null);
  const [voicePlayingId, setVoicePlayingId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [decisionSavedIds, setDecisionSavedIds] = useState<Record<string, boolean>>({});
  const [riskLoadingId, setRiskLoadingId] = useState<string | null>(null);
  const [riskSavedIds, setRiskSavedIds] = useState<Record<string, boolean>>({});
  const [knowledgeLoadingId, setKnowledgeLoadingId] = useState<string | null>(null);
  const [knowledgeSavedIds, setKnowledgeSavedIds] = useState<Record<string, boolean>>({});
  const [taskLoadingId, setTaskLoadingId] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<SaveDialog>(null);
  const [decisionTitleError, setDecisionTitleError] = useState<string | null>(null);
  const [riskTitleError, setRiskTitleError] = useState<string | null>(null);
  const [knowledgeTitleError, setKnowledgeTitleError] = useState<string | null>(null);
  const [knowledgeContentError, setKnowledgeContentError] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState({ title: "", context: "", impact: "", artifactId: "" });
  const [riskForm, setRiskForm] = useState({ title: "", impact: "", probability: "", mitigation: "", owner: "" });
  const [knowledgeForm, setKnowledgeForm] = useState({ title: "", category: "registro do Kairos", content: "" });
  const [taskForm, setTaskForm] = useState({ columnKey: "todo", priority: "media", dueDate: "" });
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [isNewConversation, setIsNewConversation] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  const selectedConversation = conversations.find((item) => item.id === conversationId) ?? null;
  const selectedProject = projects.find((item) => item.id === activeProjectId) ?? null;

  async function refreshConversations() {
    const response = await fetch("/api/conversations", {
      headers: getClientAuthHeaders(),
    });
    if (!response.ok) return;

    const payload = await response.json();
    const data = (payload?.data ?? []) as ConversationMeta[];
    setConversations(data);

  }

  async function loadMessages(targetConversationId: string) {
    const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
      headers: getClientAuthHeaders(),
    });
    if (!response.ok) return;

    const payload = await response.json();
    setMessages((payload?.data ?? []) as ChatMessage[]);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoadingHistory(true);
      const [activeProjectResponse, projectsResponse, profileResponse] = await Promise.all([
        fetch("/api/projects/active", { headers: getClientAuthHeaders() }),
        fetch("/api/projects", { headers: getClientAuthHeaders() }),
        fetch("/api/kairos/profile", { headers: getClientAuthHeaders() }),
      ]);
      if (activeProjectResponse.ok) {
        const payload = await activeProjectResponse.json();
        setActiveProjectId(payload?.data?.id ?? null);
      }
      if (projectsResponse.ok) {
        const payload = await projectsResponse.json();
        setProjects((payload?.data ?? []) as ProjectOption[]);
      }
      if (profileResponse.ok) {
        const payload = await profileResponse.json();
        setIcebreakers(((payload?.data ?? {}) as KairosProfileSummary).icebreakers ?? []);
      }
      await refreshConversations();
      setLoadingHistory(false);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!conversationId || isNewConversation) return;
    void loadMessages(conversationId);
  }, [conversationId, isNewConversation]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value || loading) return;
    if (!activeProjectId) {
      setVoiceError("Selecione um projeto antes de iniciar a conversa.");
      return;
    }

    const activeConversationId = conversationId || createConversationId();
    setConversationId(activeConversationId);

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      conversationId: activeConversationId,
      role: "user",
      content: value,
      specialist: "core",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: value,
          conversationId: activeConversationId,
          selectedSpecialist: "core",
          projectId: activeProjectId,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao processar mensagem");
      }

      const assistantMessage = payload?.data?.message as ChatMessage;
      setMessages((prev) => [...prev, assistantMessage]);
      await refreshConversations();
      setIsNewConversation(false);
    } catch (error) {
      const fallback: ChatMessage = {
        id: `${Date.now()}-assistant`,
        conversationId: activeConversationId,
        role: "assistant",
        content: error instanceof Error ? error.message : "Erro inesperado.",
        specialist: "core",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    const id = createConversationId();
    setConversationId(id);
    setMessages([]);
    setIsNewConversation(true);
    setVoiceError(null);
  }

  function selectConversation(item: ConversationMeta) {
    setConversationId(item.id);
    setActiveProjectId(item.projectId);
    setIsNewConversation(false);
    setVoiceError(item.projectId ? null : "Conversa antiga sem projeto vinculado. Inicie uma nova conversa.");
  }

  function stopCurrentAudio() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
    setVoicePlayingId(null);
  }

  async function handleListen(message: ChatMessage) {
    if (message.role !== "assistant") return;

    if (voicePlayingId === message.id) {
      stopCurrentAudio();
      return;
    }

    setVoiceError(null);
    stopCurrentAudio();
    setVoiceLoadingId(message.id);

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          text: message.content,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Erro ao gerar audio.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setVoicePlayingId(message.id);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setVoicePlayingId(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        setVoicePlayingId(null);
      };

      await audio.play();
    } catch (error) {
      console.error("[chat] voice playback error", error);
      setVoiceError(error instanceof Error ? error.message : "Falha ao gerar ou reproduzir audio.");
      setVoicePlayingId(null);
    } finally {
      setVoiceLoadingId(null);
    }
  }

  function resetFieldErrors() {
    setDecisionTitleError(null);
    setRiskTitleError(null);
    setKnowledgeTitleError(null);
    setKnowledgeContentError(null);
  }

  function openSaveDialog(kind: SaveKind, message: ChatMessage) {
    resetFieldErrors();
    if (kind === "decision") {
      setDecisionForm({ title: getSuggestedTitle(message.content, kind), context: "", impact: "", artifactId: "" });
    } else if (kind === "risk") {
      setRiskForm({ title: getSuggestedTitle(message.content, kind), impact: "", probability: "", mitigation: "", owner: "" });
    } else {
      if (kind === "knowledge") {
        setKnowledgeForm({ title: getSuggestedTitle(message.content, kind), category: "registro do Kairos", content: message.content });
      } else {
        setTaskDrafts(getTaskDrafts(message.content));
        setTaskForm({ columnKey: "todo", priority: "media", dueDate: "" });
      }
    }
    setSaveDialog({ kind, message });
  }

  function openDirectionPicker(message: ChatMessage) {
    resetFieldErrors();
    setSaveDialog({ kind: "choose", message });
  }

  async function handleSaveDecision() {
    if (!saveDialog || saveDialog.kind !== "decision" || !activeProjectId) return;
    if (!decisionForm.title.trim()) {
      setDecisionTitleError("Informe o titulo da decisao.");
      return;
    }
    setDecisionTitleError(null);

    setDecisionLoadingId(saveDialog.message.id);
    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: decisionForm.title.trim(),
          context: decisionForm.context.trim(),
          reason: saveDialog.message.content,
          impact: decisionForm.impact.trim() || `Registrada via chat (${saveDialog.message.specialist})`,
          status: "aberta",
          projectId: activeProjectId,
          conversationId,
          artifactId: decisionForm.artifactId.trim() || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Erro ao salvar decisao.");
      }

      setDecisionSavedIds((prev) => ({ ...prev, [saveDialog.message.id]: true }));
      setSaveDialog(null);
      showToast("Decisao registrada no projeto.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao salvar decisao.", "error");
    } finally {
      setDecisionLoadingId(null);
    }
  }

  async function handleSaveRisk() {
    if (!saveDialog || saveDialog.kind !== "risk" || !activeProjectId) return;
    if (!riskForm.title.trim()) {
      setRiskTitleError("Informe o titulo do risco.");
      return;
    }
    setRiskTitleError(null);

    setRiskLoadingId(saveDialog.message.id);
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
          status: "aberto",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao salvar risco.");

      setRiskSavedIds((prev) => ({ ...prev, [saveDialog.message.id]: true }));
      setSaveDialog(null);
      showToast("Risco registrado no projeto.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao salvar risco.", "error");
    } finally {
      setRiskLoadingId(null);
    }
  }

  async function handleSaveKnowledge() {
    if (!saveDialog || saveDialog.kind !== "knowledge" || !activeProjectId) return;
    const titleMissing = !knowledgeForm.title.trim();
    const contentMissing = !knowledgeForm.content.trim();
    if (titleMissing || contentMissing) {
      setKnowledgeTitleError(titleMissing ? "Informe um titulo." : null);
      setKnowledgeContentError(contentMissing ? "Informe o conteudo que sera guardado." : null);
      return;
    }
    setKnowledgeTitleError(null);
    setKnowledgeContentError(null);

    setKnowledgeLoadingId(saveDialog.message.id);
    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: knowledgeForm.title.trim(),
          category: knowledgeForm.category.trim() || "registro do Kairos",
          content: knowledgeForm.content.trim(),
          source: "chat_kairos",
          projectId: activeProjectId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao guardar conhecimento.");

      setKnowledgeSavedIds((prev) => ({ ...prev, [saveDialog.message.id]: true }));
      setSaveDialog(null);
      showToast("Conhecimento guardado no projeto.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao guardar conhecimento.", "error");
    } finally {
      setKnowledgeLoadingId(null);
    }
  }

  async function handleSaveTask() {
    if (!saveDialog || saveDialog.kind !== "task" || !activeProjectId) return;
    const selectedTasks = taskDrafts.filter((task) => task.selected && task.title.trim());
    if (selectedTasks.length === 0) {
      showToast("Selecione ao menos uma atividade com titulo.", "error");
      return;
    }

    setTaskLoadingId(saveDialog.message.id);
    try {
      for (const task of selectedTasks) {
        const response = await fetch(`/api/projects/${activeProjectId}/tasks`, {
          method: "POST",
          headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            title: task.title.trim(),
            description: task.description.trim(),
            columnKey: taskForm.columnKey,
            priority: taskForm.priority,
            dueDate: taskForm.dueDate || null,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Erro ao criar atividade no Kanban.");
      }

      setSaveDialog(null);
      showToast(
        selectedTasks.length === 1 ? "Atividade criada no Kanban." : `${selectedTasks.length} atividades criadas no Kanban.`,
        "success",
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao criar atividade no Kanban.", "error");
    } finally {
      setTaskLoadingId(null);
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-180px)] gap-3 lg:h-[calc(100vh-180px)] lg:grid-cols-[280px_1fr]">
      <aside className="workspace-card min-h-0 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-(--text-primary)">Conversas</h2>
          <button
            type="button"
            onClick={startNewConversation}
            className="workspace-button-primary px-3 py-2 text-xs"
          >
            Nova
          </button>
        </div>

        {loadingHistory ? (
          <p className="text-sm text-(--text-secondary)">Carregando historico...</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">Sem conversas salvas ainda.</p>
        ) : (
          <div className="space-y-2">
            {conversations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectConversation(item)}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-left text-xs",
                  conversationId === item.id
                    ? "border-(--accent) bg-(--accent-soft) text-(--text-primary)"
                    : "border-(--border) bg-(--bg-muted) text-(--text-secondary)",
                ].join(" ")}
              >
                <p className="truncate font-medium">{item.title}</p>
                <p className="mt-1 opacity-80">{item.projectName ?? "Sem projeto - legado"}</p>
                <p className="mt-1 opacity-80">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <PageIntro
          eyebrow="7Commander"
          title="Chat operacional"
          description="Conversa contextual com memória persistida, contexto do projeto e suporte às decisões operacionais."
          aside={
            <>
              <StatusPill tone="accent">{conversations.length} conversas</StatusPill>
              <StatusPill tone="success">
                {selectedProject ? `Projeto: ${selectedProject.name}` : "Selecione um projeto"}
              </StatusPill>
            </>
          }
        />

        <SurfaceCard className="flex flex-wrap items-end gap-3 p-3">
          <div className="min-w-[240px] flex-1">
            <SectionLabel>{isNewConversation ? "Projeto desta nova conversa" : "Projeto vinculado à conversa"}</SectionLabel>
            <select
              value={activeProjectId ?? ""}
              onChange={(event) => setActiveProjectId(event.target.value || null)}
              disabled={!isNewConversation}
              className="workspace-select mt-1 w-full"
            >
              <option value="">Selecione um projeto</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <p className="max-w-xl text-xs text-(--text-secondary)">
            {isNewConversation
              ? "O projeto escolhido será gravado ao enviar a primeira mensagem e não poderá ser trocado nesta conversa."
              : selectedConversation?.projectId
                ? "Este histórico e todas as próximas mensagens permanecem restritos ao projeto exibido."
                : "Histórico legado apenas para consulta. Para falar com o Kairos, abra uma nova conversa."}
          </p>
        </SurfaceCard>

        <SurfaceCard className="min-h-0 flex-1 overflow-y-auto p-4">
          {voiceError ? (
            <p className="mb-3 rounded-lg bg-(--danger-soft) px-3 py-2 text-xs text-(--danger)">{voiceError}</p>
          ) : null}
          {!hasMessages ? (
            <div>
              <p className="text-sm text-(--text-secondary)">
                Inicie a conversa para ativar o nucleo operacional.
              </p>
              {icebreakers.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--text-secondary)">Sugestoes para comecar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {icebreakers.map((icebreaker) => (
                      <button
                        key={icebreaker}
                        type="button"
                        onClick={() => setInput(icebreaker)}
                        className="workspace-button-secondary text-left text-xs"
                      >
                        {icebreaker}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={[
                    "max-w-[85%] rounded-[1.2rem] px-4 py-3 text-sm",
                    message.role === "user"
                      ? "ml-auto bg-(--accent) text-white"
                      : "border border-(--border) bg-(--bg-muted) text-(--text-primary)",
                  ].join(" ")}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                    <span className={message.role === "user" ? "text-white/75" : "text-(--accent)"}>
                      {message.role === "user" ? "Voce" : "Kairos"}
                    </span>
                  </div>
                  {message.role === "assistant" ? (
                    <MarkdownContent content={message.content} className="chat-response-markdown" />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p
                    className={[
                      "mt-1 text-[13px]",
                      message.role === "user" ? "text-white/75" : "text-(--text-secondary)",
                    ].join(" ")}
                  >
                    {message.specialist}
                  </p>
                  {message.role === "assistant" ? (
                    <div className="mt-3">
                      {hasSaveSuggestion(message.content, "decision") || hasSaveSuggestion(message.content, "risk") ? (
                        <p className="mb-2 text-xs font-semibold text-(--accent)">
                          O que deseja fazer com esta analise?
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleListen(message)}
                        disabled={voiceLoadingId === message.id}
                        className="workspace-button-secondary px-3 py-2 text-[13px]"
                      >
                        {voiceLoadingId === message.id
                          ? "Gerando audio..."
                          : voicePlayingId === message.id
                            ? "Parar audio"
                            : "Ouvir resposta"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDirectionPicker(message)}
                        className="workspace-button-primary px-3 py-2 text-[13px]"
                      >
                        Direcionar resposta
                      </button>

                      {hasSaveSuggestion(message.content, "decision") ? (
                        <button
                          type="button"
                          onClick={() => openSaveDialog("decision", message)}
                          disabled={decisionLoadingId === message.id || decisionSavedIds[message.id]}
                          className="workspace-button-secondary px-3 py-2 text-[13px]"
                        >
                          {decisionSavedIds[message.id] ? "Decisao salva" : "Registrar decisao sugerida"}
                        </button>
                      ) : null}
                      {hasSaveSuggestion(message.content, "risk") ? (
                        <button
                          type="button"
                          onClick={() => openSaveDialog("risk", message)}
                          disabled={riskLoadingId === message.id || riskSavedIds[message.id]}
                          className="workspace-button-secondary px-3 py-2 text-[13px]"
                        >
                          {riskSavedIds[message.id] ? "Risco salvo" : "Registrar risco identificado"}
                        </button>
                      ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SurfaceCard>

        <form onSubmit={handleSubmit} className="workspace-card p-3">
          <SectionLabel>Entrada</SectionLabel>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escreva sua mensagem..."
              className="workspace-input flex-1"
            />
            <button
              type="submit"
              disabled={loading || !activeProjectId || (!isNewConversation && !selectedConversation?.projectId)}
              className="workspace-button-primary"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>

      {saveDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="save-dialog-title" className="workspace-card w-full max-w-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--accent)">Registro no projeto</p>
                <h2 id="save-dialog-title" className="mt-1 text-lg font-semibold text-(--text-primary)">
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
                  Revise e complete as informacoes antes de salvar em {selectedProject?.name ?? "este projeto"}.
                </p>
              </div>
              <button type="button" onClick={() => setSaveDialog(null)} className="workspace-button-secondary px-3 py-2 text-xs">Fechar</button>
            </div>

            {saveDialog.kind === "choose" ? (
              <div className="mt-6">
                <p className="text-sm font-medium text-(--text-primary)">Como deseja usar esta resposta?</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <button type="button" onClick={() => openSaveDialog("decision", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--accent-soft) text-sm font-bold text-(--accent)">D</span>
                    <span className="block">
                      <span className="block text-base font-semibold text-(--text-primary)">Decisao</span>
                      <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Formalize uma escolha, sua justificativa e o impacto esperado.</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => openSaveDialog("risk", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">R</span>
                    <span className="block">
                      <span className="block text-base font-semibold text-(--text-primary)">Risco</span>
                      <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Registre impacto, probabilidade, responsavel e plano de mitigacao.</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => openSaveDialog("knowledge", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">C</span>
                    <span className="block">
                      <span className="block text-base font-semibold text-(--text-primary)">Conhecimento</span>
                      <span className="mt-1 block text-sm leading-5 text-(--text-secondary)">Guarde esta resposta como referencia e contexto permanente do projeto.</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => openSaveDialog("task", saveDialog.message)} className="group flex min-h-36 items-start gap-4 rounded-2xl border border-(--border) bg-white p-5 text-left transition hover:border-(--accent) hover:bg-(--accent-ghost)">
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
                    value={decisionForm.title}
                    onChange={(event) => {
                      setDecisionForm((prev) => ({ ...prev, title: event.target.value }));
                      if (decisionTitleError) setDecisionTitleError(null);
                    }}
                    aria-invalid={Boolean(decisionTitleError)}
                    className={`workspace-input mt-1 w-full ${decisionTitleError ? "field-invalid" : ""}`}
                  />
                  {decisionTitleError ? <p className="field-error">{decisionTitleError}</p> : null}
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Contexto
                  <textarea value={decisionForm.context} onChange={(event) => setDecisionForm((prev) => ({ ...prev, context: event.target.value }))} className="workspace-input mt-1 min-h-24 w-full" />
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Impacto esperado
                  <textarea value={decisionForm.impact} onChange={(event) => setDecisionForm((prev) => ({ ...prev, impact: event.target.value }))} className="workspace-input mt-1 min-h-24 w-full" />
                </label>
                <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Artefato relacionado (opcional)
                  <input value={decisionForm.artifactId} onChange={(event) => setDecisionForm((prev) => ({ ...prev, artifactId: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
              </div>
            ) : saveDialog.kind === "risk" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 text-xs font-medium text-(--text-primary)">Titulo do risco
                  <input
                    value={riskForm.title}
                    onChange={(event) => {
                      setRiskForm((prev) => ({ ...prev, title: event.target.value }));
                      if (riskTitleError) setRiskTitleError(null);
                    }}
                    aria-invalid={Boolean(riskTitleError)}
                    className={`workspace-input mt-1 w-full ${riskTitleError ? "field-invalid" : ""}`}
                  />
                  {riskTitleError ? <p className="field-error">{riskTitleError}</p> : null}
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Impacto
                  <input value={riskForm.impact} onChange={(event) => setRiskForm((prev) => ({ ...prev, impact: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Probabilidade
                  <input value={riskForm.probability} onChange={(event) => setRiskForm((prev) => ({ ...prev, probability: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Responsavel
                  <input value={riskForm.owner} onChange={(event) => setRiskForm((prev) => ({ ...prev, owner: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Plano de mitigacao
                  <input value={riskForm.mitigation} onChange={(event) => setRiskForm((prev) => ({ ...prev, mitigation: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
              </div>
            ) : saveDialog.kind === "knowledge" ? (
              <div className="mt-5 grid gap-3">
                <label className="text-xs font-medium text-(--text-primary)">Titulo do conhecimento
                  <input
                    value={knowledgeForm.title}
                    onChange={(event) => {
                      setKnowledgeForm((prev) => ({ ...prev, title: event.target.value }));
                      if (knowledgeTitleError) setKnowledgeTitleError(null);
                    }}
                    aria-invalid={Boolean(knowledgeTitleError)}
                    className={`workspace-input mt-1 w-full ${knowledgeTitleError ? "field-invalid" : ""}`}
                  />
                  {knowledgeTitleError ? <p className="field-error">{knowledgeTitleError}</p> : null}
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Categoria
                  <input value={knowledgeForm.category} onChange={(event) => setKnowledgeForm((prev) => ({ ...prev, category: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Conteudo que sera guardado
                  <textarea
                    value={knowledgeForm.content}
                    onChange={(event) => {
                      setKnowledgeForm((prev) => ({ ...prev, content: event.target.value }));
                      if (knowledgeContentError) setKnowledgeContentError(null);
                    }}
                    aria-invalid={Boolean(knowledgeContentError)}
                    className={`workspace-input mt-1 min-h-48 w-full ${knowledgeContentError ? "field-invalid" : ""}`}
                  />
                  {knowledgeContentError ? <p className="field-error">{knowledgeContentError}</p> : null}
                </label>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-(--border) bg-(--accent-ghost) px-4 py-3">
                  <p className="text-sm font-semibold text-(--text-primary)">{taskDrafts.length} {taskDrafts.length === 1 ? "atividade identificada" : "atividades identificadas"}</p>
                  <p className="mt-1 text-xs text-(--text-secondary)">Selecione e ajuste os cards que devem ser criados no Kanban.</p>
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {taskDrafts.map((task, index) => (
                    <div key={task.id} className="rounded-xl border border-(--border) bg-white p-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
                        <input type="checkbox" checked={task.selected} onChange={(event) => setTaskDrafts((prev) => prev.map((item) => item.id === task.id ? { ...item, selected: event.target.checked } : item))} />
                        Atividade {index + 1}
                      </label>
                      <input value={task.title} disabled={!task.selected} onChange={(event) => setTaskDrafts((prev) => prev.map((item) => item.id === task.id ? { ...item, title: event.target.value } : item))} className="workspace-input mt-2 w-full" aria-label={`Titulo da atividade ${index + 1}`} />
                      <textarea value={task.description} disabled={!task.selected} onChange={(event) => setTaskDrafts((prev) => prev.map((item) => item.id === task.id ? { ...item, description: event.target.value } : item))} className="workspace-input mt-2 min-h-20 w-full" aria-label={`Descricao da atividade ${index + 1}`} />
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-(--text-primary)">Coluna do Kanban
                  <select value={taskForm.columnKey} onChange={(event) => setTaskForm((prev) => ({ ...prev, columnKey: event.target.value }))} className="workspace-select mt-1 w-full">
                    <option value="todo">TO DO</option>
                    <option value="doing">DOING</option>
                    <option value="done">DONE</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Prioridade
                  <select value={taskForm.priority} onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))} className="workspace-select mt-1 w-full">
                    <option value="baixa">Baixa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-(--text-primary)">Data limite (opcional)
                  <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))} className="workspace-input mt-1 w-full" />
                </label>
                </div>
              </div>
            )}

            {saveDialog.kind !== "choose" ? <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSaveDialog(null)} className="workspace-button-secondary px-4 py-2 text-sm">Cancelar</button>
              <button
                type="button"
                onClick={() => void (saveDialog.kind === "decision" ? handleSaveDecision() : saveDialog.kind === "risk" ? handleSaveRisk() : saveDialog.kind === "knowledge" ? handleSaveKnowledge() : handleSaveTask())}
                disabled={decisionLoadingId === saveDialog.message.id || riskLoadingId === saveDialog.message.id || knowledgeLoadingId === saveDialog.message.id || taskLoadingId === saveDialog.message.id}
                className="workspace-button-primary px-4 py-2 text-sm"
              >
                {decisionLoadingId === saveDialog.message.id || riskLoadingId === saveDialog.message.id || knowledgeLoadingId === saveDialog.message.id || taskLoadingId === saveDialog.message.id ? "Salvando..." : "Confirmar e salvar"}
              </button>
            </div> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
