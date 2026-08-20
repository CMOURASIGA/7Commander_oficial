"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage, ConversationMeta } from "@/types/chat";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

/**
 * Nucleo unico de interacao com o Kairos: mensagens, projeto ativo, captura
 * de voz (com deteccao de silencio e modo continuo), leitura em audio (TTS)
 * e o fluxo "Direcionar resposta" (decisao/risco/conhecimento/atividade).
 *
 * Usado por /chat, /voice e pelo painel flutuante (components/kairos) — as
 * tres superficies compartilham exatamente a mesma capacidade; o que muda
 * entre elas e so o layout.
 */

export type ProjectOption = { id: string; name: string; status: string };

type KairosProjectMeta = {
  id: string | null;
  name: string | null;
  confidence: number;
  action: "created" | "reused" | "suggest_new" | "none";
  suggestedName?: string;
};

export type MessageSource = "voice" | "text";

export type KairosMessage = ChatMessage & { source?: MessageSource };

export type VoiceState = "inativo" | "ouvindo" | "processando" | "respondendo" | "pausado" | "erro";
export type VoiceUiState = "idle" | "listening" | "processing" | "paused";

export type SaveKind = "decision" | "risk" | "knowledge" | "task";
export type SaveDialog = { kind: SaveKind | "choose"; message: KairosMessage } | null;
export type TaskDraft = { id: string; title: string; description: string; selected: boolean };

function removeMarkdown(value: string): string {
  return value.replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
}

export function getTaskDrafts(content: string): TaskDraft[] {
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

export function getSuggestedTitle(content: string, kind: SaveKind): string {
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

export function hasSaveSuggestion(content: string, kind: SaveKind): boolean {
  const pattern = kind === "decision"
    ? /(?:#{1,6}\s*decis(?:a|ã)o\s+(?:sugerida|proposta|para registrar)|decis(?:a|ã)o\s+proposta\s*:)/i
    : /(?:#{1,6}\s*risco\s+(?:identificado|sugerido|para registrar)|sugest(?:a|ã)o\s+de\s+risco\s+operacional\s*:|riscos?\s+identificados?\s*:)/i;
  return pattern.test(content);
}

export function createConversationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

function chooseMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "audio/webm";
}

export function toVoiceUiState(state: VoiceState): VoiceUiState {
  if (state === "ouvindo") return "listening";
  if (state === "processando" || state === "respondendo") return "processing";
  if (state === "pausado") return "paused";
  return "idle";
}

function addSessionEvent(setter: React.Dispatch<React.SetStateAction<string[]>>, text: string) {
  setter((prev) => [text, ...prev].slice(0, 8));
}

type UseKairosCoreOptions = {
  /** Pre-seleciona um projeto ao montar (ex.: aberto a partir de um card do Kanban). */
  initialProjectId?: string | null;
  /** Pre-preenche o campo de texto ao montar. */
  initialInput?: string;
};

export function useKairosCore(options?: UseKairosCoreOptions) {
  const auth = useKairosAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [conversationId, setConversationId] = useState<string>(createConversationId);
  const [isNewConversation, setIsNewConversation] = useState(true);
  const [messages, setMessages] = useState<KairosMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(options?.initialProjectId ?? null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);

  const [input, setInput] = useState(options?.initialInput ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [voiceState, setVoiceState] = useState<VoiceState>("inativo");
  const [isBusy, setIsBusy] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [sessionMemory, setSessionMemory] = useState<string[]>([]);

  const [voiceLoadingId, setVoiceLoadingId] = useState<string | null>(null);
  const [voicePlayingId, setVoicePlayingId] = useState<string | null>(null);

  const [saveDialog, setSaveDialog] = useState<SaveDialog>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [decisionSavedIds, setDecisionSavedIds] = useState<Record<string, boolean>>({});
  const [riskLoadingId, setRiskLoadingId] = useState<string | null>(null);
  const [riskSavedIds, setRiskSavedIds] = useState<Record<string, boolean>>({});
  const [knowledgeLoadingId, setKnowledgeLoadingId] = useState<string | null>(null);
  const [knowledgeSavedIds, setKnowledgeSavedIds] = useState<Record<string, boolean>>({});
  const [taskLoadingId, setTaskLoadingId] = useState<string | null>(null);
  const [decisionTitleError, setDecisionTitleError] = useState<string | null>(null);
  const [riskTitleError, setRiskTitleError] = useState<string | null>(null);
  const [knowledgeTitleError, setKnowledgeTitleError] = useState<string | null>(null);
  const [knowledgeContentError, setKnowledgeContentError] = useState<string | null>(null);
  const [decisionForm, setDecisionForm] = useState({ title: "", context: "", impact: "", artifactId: "" });
  const [riskForm, setRiskForm] = useState({ title: "", impact: "", probability: "", mitigation: "", owner: "" });
  const [knowledgeForm, setKnowledgeForm] = useState({ title: "", category: "registro do Kairos", content: "" });
  const [taskForm, setTaskForm] = useState({ columnKey: "todo", priority: "media", dueDate: "" });
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceFrameRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef<number>(Date.now());
  const recordingStartedAtRef = useRef<number>(Date.now());
  const busyRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("inativo");

  const canLoadWorkspace = !auth.loading && (!auth.required || Boolean(auth.user));
  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);
  const selectedConversation = conversations.find((item) => item.id === conversationId) ?? null;
  const selectedProject = projects.find((item) => item.id === activeProjectId) ?? null;
  const activeProject = selectedProject;
  const voiceUiState = toVoiceUiState(voiceState);
  const canSend = Boolean(activeProjectId) && (isNewConversation || Boolean(selectedConversation?.projectId));

  useEffect(() => { busyRef.current = isBusy; }, [isBusy]);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/conversations", { headers: getClientAuthHeaders() });
    if (!response.ok) return;
    const payload = await response.json();
    setConversations((payload?.data ?? []) as ConversationMeta[]);
  }, []);

  const loadMessages = useCallback(async (targetConversationId: string) => {
    const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
      headers: getClientAuthHeaders(),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setMessages((payload?.data ?? []) as KairosMessage[]);
  }, []);

  const reloadProjects = useCallback(async () => {
    try {
      const [activeRes, listRes] = await Promise.all([
        fetch("/api/projects/active", { headers: getClientAuthHeaders() }),
        fetch("/api/projects", { headers: getClientAuthHeaders() }),
      ]);
      if (activeRes.ok) {
        const payload = await activeRes.json();
        if (!options?.initialProjectId) setActiveProjectId(payload?.data?.id ?? null);
      }
      if (listRes.ok) {
        const payload = await listRes.json();
        setProjects((payload?.data ?? []) as ProjectOption[]);
      }
    } catch {
      // mantem selecao local se a rede falhar
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canLoadWorkspace) return;
    let active = true;

    async function bootstrap() {
      setLoadingHistory(true);
      const [profileResponse] = await Promise.all([
        fetch("/api/kairos/profile", { headers: getClientAuthHeaders() }),
        reloadProjects(),
        refreshConversations(),
      ]);
      if (!active) return;
      if (profileResponse.ok) {
        const payload = await profileResponse.json();
        setIcebreakers((payload?.data?.icebreakers ?? []) as string[]);
      }
      setLoadingHistory(false);
    }

    void bootstrap();
    return () => {
      active = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (silenceFrameRef.current) cancelAnimationFrame(silenceFrameRef.current);
      if (audioContextRef.current) void audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadWorkspace]);

  useEffect(() => {
    if (!conversationId || isNewConversation) return;
    void loadMessages(conversationId);
  }, [conversationId, isNewConversation, loadMessages]);

  function clearVoiceCaptureResources() {
    if (silenceFrameRef.current) { cancelAnimationFrame(silenceFrameRef.current); silenceFrameRef.current = null; }
    if (audioContextRef.current) { void audioContextRef.current.close(); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
  }

  function stopCurrentAudio() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
    setVoicePlayingId(null);
  }

  const startNewConversation = useCallback(() => {
    setConversationId(createConversationId());
    setMessages([]);
    setIsNewConversation(true);
    setError(null);
  }, []);

  const selectConversation = useCallback((item: ConversationMeta) => {
    setConversationId(item.id);
    setActiveProjectId(item.projectId);
    setIsNewConversation(false);
    setError(item.projectId ? null : "Conversa antiga sem projeto vinculado. Inicie uma nova conversa.");
  }, []);

  const activateProject = useCallback(async (projectId: string) => {
    if (!projectId) {
      setError("Selecione um projeto antes de continuar.");
      return;
    }
    if (projectId !== activeProjectId && hasMessages) {
      const confirmed = await confirm({
        title: "Trocar de projeto?",
        description: "Trocar o projeto inicia uma nova conversa com o Kairos. O histórico atual continua salvo, mas deixa de aparecer aqui.",
        confirmLabel: "Trocar projeto",
        cancelLabel: "Continuar aqui",
      });
      if (!confirmed) return;
      startNewConversation();
      addSessionEvent(setSessionMemory, "Nova conversa iniciada para evitar mistura de contextos entre projetos.");
    }
    setActiveProjectId(projectId);
    try {
      await fetch("/api/projects/active", {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ projectId }),
      });
      addSessionEvent(setSessionMemory, `Projeto ativo alterado para ${projects.find((item) => item.id === projectId)?.name ?? "novo contexto"}.`);
    } catch {
      // mantem selecao local se a rede falhar
    }
  }, [activeProjectId, confirm, hasMessages, projects, startNewConversation]);

  async function playTTS(text: string, messageId?: string): Promise<void> {
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || "Falha ao gerar audio de resposta.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    if (messageId) setVoicePlayingId(messageId);
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; setVoicePlayingId(null); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; setVoicePlayingId(null); resolve(); };
    });
  }

  const handleListen = useCallback(async (message: KairosMessage) => {
    if (message.role !== "assistant") return;
    if (voicePlayingId === message.id) { stopCurrentAudio(); return; }
    setError(null);
    stopCurrentAudio();
    setVoiceLoadingId(message.id);
    try {
      await playTTS(message.content, message.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao gerar ou reproduzir audio.", "error");
    } finally {
      setVoiceLoadingId(null);
    }
     
  }, [voicePlayingId, showToast]);

  const sendMessage = useCallback(async (rawText: string, source: MessageSource, opts?: { speak?: boolean }) => {
    const value = rawText.trim();
    if (!value || loading) return;
    if (!activeProjectId) {
      setError("Selecione um projeto antes de iniciar a conversa.");
      return;
    }
    if (!isNewConversation && !selectedConversation?.projectId) {
      setError("Histórico legado sem projeto. Inicie uma nova conversa para falar com o Kairos.");
      return;
    }

    const activeConversationId = conversationId || createConversationId();
    setConversationId(activeConversationId);

    const userMessage: KairosMessage = {
      id: `${Date.now()}-user`,
      conversationId: activeConversationId,
      role: "user",
      content: value,
      specialist: "core",
      createdAt: new Date().toISOString(),
      source,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsBusy(true);
    setVoiceState("processando");
    addSessionEvent(setSessionMemory, source === "voice" ? "Mensagem de voz transcrita e adicionada ao histórico." : "Mensagem enviada ao histórico.");

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
      if (!response.ok) throw new Error(payload?.error || "Erro ao processar mensagem.");

      const assistantMessage = { ...(payload?.data?.message as KairosMessage), source };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsNewConversation(false);
      await refreshConversations();
      addSessionEvent(setSessionMemory, "Resposta operacional gerada para o projeto ativo.");

      const projectMeta = payload?.data?.project as KairosProjectMeta | undefined;
      if (projectMeta?.action === "created" || projectMeta?.action === "reused") {
        if (projectMeta.id) setActiveProjectId(projectMeta.id);
        await reloadProjects();
        addSessionEvent(setSessionMemory, `Contexto sincronizado com ${projectMeta.name ?? "o projeto ativo"}.`);
      }

      if (opts?.speak) {
        setVoiceState("respondendo");
        await playTTS(assistantMessage.content, assistantMessage.id);
      }
      setVoiceState("pausado");

      if (continuousMode && opts?.speak) {
        window.setTimeout(() => {
          if (!busyRef.current && voiceStateRef.current !== "erro") void startListening();
        }, 450);
      }
    } catch (err) {
      setVoiceState("erro");
      const messageText = err instanceof Error ? err.message : "Erro inesperado.";
      if (source === "voice") {
        setError(messageText);
      } else {
        showToast(messageText, "error");
      }
      addSessionEvent(setSessionMemory, "Falha ao processar a interação atual.");
    } finally {
      setLoading(false);
      setIsBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, conversationId, continuousMode, isNewConversation, loading, refreshConversations, reloadProjects, selectedConversation, showToast]);

  async function transcribeAudio(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("audio", blob, "voice-input.webm");
    const response = await fetch("/api/voice/transcribe", { method: "POST", headers: getClientAuthHeaders(), body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Erro na transcricao de audio.");
    return payload?.data?.transcript?.trim() || "";
  }

  async function processRecordedAudio(blob: Blob) {
    try {
      const transcribed = await transcribeAudio(blob);
      if (!transcribed) throw new Error("Nao foi possivel entender o audio.");
      await sendMessage(transcribed, "voice", { speak: true });
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Falha no ciclo de voz.");
    }
  }

  const startListening = useCallback(async () => {
    if (isBusy || voiceState === "ouvindo") return;
    if (!activeProjectId) { setError("Selecione um projeto antes de iniciar a captura de voz."); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: chooseMimeType() });
      lastSoundAtRef.current = Date.now();
      recordingStartedAtRef.current = Date.now();

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);

      const detectSilence = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const value of dataArray) { const centered = (value - 128) / 128; sum += centered * centered; }
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms > 0.02) lastSoundAtRef.current = Date.now();
        const now = Date.now();
        const recordingForMs = now - recordingStartedAtRef.current;
        const silenceForMs = now - lastSoundAtRef.current;
        if (recorder.state === "recording" && recordingForMs > 1200 && silenceForMs > 1400) { recorder.stop(); return; }
        silenceFrameRef.current = requestAnimationFrame(detectSilence);
      };

      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        clearVoiceCaptureResources();
        void processRecordedAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      silenceFrameRef.current = requestAnimationFrame(detectSilence);
      setVoiceState("ouvindo");
      addSessionEvent(setSessionMemory, "Microfone ativado para captura de voz.");
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar o microfone.");
      clearVoiceCaptureResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy, voiceState, activeProjectId]);

  function pauseListening() {
    if (voiceState === "pausado") { void startListening(); return; }
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
    setVoiceState("pausado");
    addSessionEvent(setSessionMemory, "Captura de voz pausada manualmente.");
  }

  function finishSession() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    clearVoiceCaptureResources();
    stopCurrentAudio();
    setVoiceState("inativo");
    setIsBusy(false);
    addSessionEvent(setSessionMemory, "Sessão de voz encerrada.");
  }

  async function handleTextSubmit() {
    if (!input.trim() || isBusy || loading) return;
    await sendMessage(input, "text");
  }

  function resetFieldErrors() {
    setDecisionTitleError(null);
    setRiskTitleError(null);
    setKnowledgeTitleError(null);
    setKnowledgeContentError(null);
  }

  function openSaveDialog(kind: SaveKind, message: KairosMessage) {
    resetFieldErrors();
    if (kind === "decision") {
      setDecisionForm({ title: getSuggestedTitle(message.content, kind), context: "", impact: "", artifactId: "" });
    } else if (kind === "risk") {
      setRiskForm({ title: getSuggestedTitle(message.content, kind), impact: "", probability: "", mitigation: "", owner: "" });
    } else if (kind === "knowledge") {
      setKnowledgeForm({ title: getSuggestedTitle(message.content, kind), category: "registro do Kairos", content: message.content });
    } else {
      setTaskDrafts(getTaskDrafts(message.content));
      setTaskForm({ columnKey: "todo", priority: "media", dueDate: "" });
    }
    setSaveDialog({ kind, message });
  }

  function openDirectionPicker(message: KairosMessage) {
    resetFieldErrors();
    setSaveDialog({ kind: "choose", message });
  }

  function closeSaveDialog() { setSaveDialog(null); }

  async function handleSaveDecision() {
    if (!saveDialog || saveDialog.kind !== "decision" || !activeProjectId) return;
    if (!decisionForm.title.trim()) { setDecisionTitleError("Informe o titulo da decisao."); return; }
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
          impact: decisionForm.impact.trim() || `Registrada via Kairos (${saveDialog.message.specialist})`,
          status: "aberta",
          projectId: activeProjectId,
          conversationId,
          artifactId: decisionForm.artifactId.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Erro ao salvar decisao.");
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
    if (!riskForm.title.trim()) { setRiskTitleError("Informe o titulo do risco."); return; }
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
          source: "kairos_core",
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
    if (selectedTasks.length === 0) { showToast("Selecione ao menos uma atividade com titulo.", "error"); return; }
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
      showToast(selectedTasks.length === 1 ? "Atividade criada no Kanban." : `${selectedTasks.length} atividades criadas no Kanban.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao criar atividade no Kanban.", "error");
    } finally {
      setTaskLoadingId(null);
    }
  }

  return {
    // auth / bootstrap
    auth, canLoadWorkspace, loadingHistory,
    // conversation
    conversationId, isNewConversation, messages, hasMessages, conversations, selectedConversation,
    startNewConversation, selectConversation,
    // projects
    projects, activeProjectId, selectedProject, activeProject, activateProject, canSend,
    icebreakers,
    // text input
    input, setInput, handleTextSubmit, loading,
    // errors
    error, setError,
    // voice
    voiceState, voiceUiState, isBusy, continuousMode, setContinuousMode, sessionMemory,
    startListening, pauseListening, finishSession,
    // tts
    voiceLoadingId, voicePlayingId, handleListen,
    // save flow
    saveDialog, openSaveDialog, openDirectionPicker, closeSaveDialog,
    decisionForm, setDecisionForm, decisionTitleError, decisionLoadingId, decisionSavedIds, handleSaveDecision,
    riskForm, setRiskForm, riskTitleError, riskLoadingId, riskSavedIds, handleSaveRisk,
    knowledgeForm, setKnowledgeForm, knowledgeTitleError, knowledgeContentError, knowledgeLoadingId, knowledgeSavedIds, handleSaveKnowledge,
    taskDrafts, setTaskDrafts, taskForm, setTaskForm, taskLoadingId, handleSaveTask,
    // clearing field errors on edit
    setDecisionTitleError, setRiskTitleError, setKnowledgeTitleError, setKnowledgeContentError,
    // send
    sendMessage,
  };
}

export type KairosCore = ReturnType<typeof useKairosCore>;
