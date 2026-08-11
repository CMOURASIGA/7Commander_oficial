"use client";

import Link from "next/link";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { useKairosAuth } from "@/components/auth/kairos-auth-provider";
import { BRAND_NAME } from "@/lib/brand";
import { VoiceGlyph } from "@/components/icons/voice-icons";
import { SectionLabel, StatusPill } from "@/components/ui/workspace-primitives";

type VoiceState = "inativo" | "ouvindo" | "processando" | "respondendo" | "pausado" | "erro";

type ProjectOption = {
  id: string;
  name: string;
  status: string;
};

type KairosProjectMeta = {
  id: string | null;
  name: string | null;
  confidence: number;
  action: "created" | "reused" | "suggest_new" | "none";
  suggestedName?: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  source: "voice" | "text";
};

function createConversationId(): string {
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

function toVoiceUiState(state: VoiceState): "idle" | "listening" | "processing" | "paused" {
  if (state === "ouvindo") return "listening";
  if (state === "processando" || state === "respondendo") return "processing";
  if (state === "pausado") return "paused";
  return "idle";
}

function getStateLabels(state: VoiceState) {
  const voiceUiState = toVoiceUiState(state);
  if (voiceUiState === "listening") {
    return { label: "Escutando...", sub: "Fale agora — modo contínuo ativo" };
  }
  if (voiceUiState === "processing") {
    return { label: "Processando...", sub: "Aguarde a resposta do Kairos" };
  }
  if (voiceUiState === "paused") {
    return { label: "Pausado", sub: "Clique no orbe para retomar" };
  }
  return { label: "Pronto para iniciar", sub: "Clique no orbe para começar" };
}

function formatUserInitials(email: string | null) {
  const parts = (email ?? "operador")
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean);
  return (parts[0]?.[0] ?? "O").toUpperCase();
}

function addSessionEvent(setter: React.Dispatch<React.SetStateAction<string[]>>, text: string) {
  setter((prev) => [text, ...prev].slice(0, 8));
}

export default function VoiceRoomPage() {
  const auth = useKairosAuth();
  const [voiceState, setVoiceState] = useState<VoiceState>("inativo");
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(createConversationId);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionMemory, setSessionMemory] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceFrameRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef<number>(Date.now());
  const recordingStartedAtRef = useRef<number>(Date.now());
  const busyRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("inativo");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeProject = useMemo(
    () => projects.find((item) => item.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  );
  const voiceUiState = toVoiceUiState(voiceState);
  const stateLabels = getStateLabels(voiceState);
  const pauseLabel = voiceState === "pausado" ? "Retomar" : "Pausar";
  const currentDateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const canLoadWorkspace = !auth.loading && (!auth.required || Boolean(auth.user));
  const userEmail = auth.user?.email ?? null;
  const userInitials = formatUserInitials(userEmail);
  const activeProjectLabel = activeProject?.name ?? "Nenhum projeto ativo";
  const activeProjectStatusLabel = activeProject?.status ?? "sem projeto selecionado";

  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function reloadProjects() {
    try {
      const [activeRes, listRes] = await Promise.all([
        fetch("/api/projects/active", { headers: getClientAuthHeaders() }),
        fetch("/api/projects", { headers: getClientAuthHeaders() }),
      ]);

      if (activeRes.ok) {
        const payload = await activeRes.json();
        setActiveProjectId(payload?.data?.id ?? null);
      }

      if (listRes.ok) {
        const payload = await listRes.json();
        setProjects((payload?.data ?? []) as ProjectOption[]);
      }
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    if (!canLoadWorkspace) return;

    void reloadProjects();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (silenceFrameRef.current) {
        cancelAnimationFrame(silenceFrameRef.current);
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [canLoadWorkspace]);

  function clearVoiceCaptureResources() {
    if (silenceFrameRef.current) {
      cancelAnimationFrame(silenceFrameRef.current);
      silenceFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function handleActivateProject(projectId: string) {
    if (!projectId) {
      setError("Selecione um projeto antes de iniciar o Voice Room.");
      return;
    }
    if (projectId !== activeProjectId && messages.length > 0) {
      const confirmed = window.confirm("Trocar o projeto inicia uma nova conversa de Voice Room. Deseja continuar?");
      if (!confirmed) return;
      setConversationId(createConversationId());
      setMessages([]);
      addSessionEvent(setSessionMemory, "Nova conversa iniciada para evitar mistura de contextos entre projetos.");
    }
    try {
      setActiveProjectId(projectId || null);
      await fetch("/api/projects/active", {
        method: "PATCH",
        headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ projectId }),
      });
      addSessionEvent(setSessionMemory, `Projeto ativo alterado para ${projects.find((item) => item.id === projectId)?.name ?? "novo contexto"}.`);
    } catch {
      // keep local selection
    }
  }

  async function transcribeAudio(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("audio", blob, "voice-input.webm");

    const response = await fetch("/api/voice/transcribe", {
      method: "POST",
      headers: getClientAuthHeaders(),
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Erro na transcricao de audio.");
    return payload?.data?.transcript?.trim() || "";
  }

  async function askKairos(message: string): Promise<{ answer: string; project: KairosProjectMeta | null }> {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: getClientAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message,
        conversationId,
        selectedSpecialist: "core",
        projectId: activeProjectId,
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Erro no núcleo operacional.");
    return {
      answer: payload?.data?.message?.content?.trim() || "",
      project: (payload?.data?.project as KairosProjectMeta | undefined) ?? null,
    };
  }

  async function playTTS(text: string): Promise<void> {
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
    await audio.play();

    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
    });
  }

  async function handleAssistantResponse(userContent: string, source: "voice" | "text", shouldSpeak: boolean) {
    setIsBusy(true);
    setError(null);
    setVoiceState("processando");

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: userContent,
      createdAt: new Date().toISOString(),
      source,
    };
    setMessages((prev) => [...prev, userMessage]);
    addSessionEvent(setSessionMemory, source === "voice" ? "Mensagem de voz transcrita e adicionada ao histórico." : "Mensagem digitada enviada ao histórico.");

    try {
      const result = await askKairos(userContent);
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: result.answer,
        createdAt: new Date().toISOString(),
        source,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      addSessionEvent(setSessionMemory, "Resposta operacional gerada para o projeto ativo.");

      if (result.project?.action === "created" || result.project?.action === "reused") {
        if (result.project.id) setActiveProjectId(result.project.id);
        await reloadProjects();
        addSessionEvent(setSessionMemory, `Contexto sincronizado com ${result.project.name ?? "o projeto ativo"}.`);
      }

      if (shouldSpeak) {
        setVoiceState("respondendo");
        await playTTS(result.answer);
      }

      setVoiceState("pausado");

      if (continuousMode && shouldSpeak) {
        window.setTimeout(() => {
          if (!busyRef.current && voiceStateRef.current !== "erro") {
            void startListening();
          }
        }, 450);
      }
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Falha no ciclo de voz.");
      addSessionEvent(setSessionMemory, "Falha ao processar a interação atual.");
    } finally {
      setIsBusy(false);
    }
  }

  async function processRecordedAudio(blob: Blob) {
    try {
      const transcribed = await transcribeAudio(blob);
      if (!transcribed) {
        throw new Error("Nao foi possivel entender o audio.");
      }
      await handleAssistantResponse(transcribed, "voice", true);
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Falha no ciclo de voz.");
    }
  }

  async function startListening() {
    if (isBusy || voiceState === "ouvindo") return;
    if (!activeProjectId) {
      setError("Selecione um projeto antes de iniciar o Voice Room.");
      return;
    }
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: chooseMimeType(),
      });
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
        for (const value of dataArray) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms > 0.02) {
          lastSoundAtRef.current = Date.now();
        }

        const now = Date.now();
        const recordingForMs = now - recordingStartedAtRef.current;
        const silenceForMs = now - lastSoundAtRef.current;
        if (recorder.state === "recording" && recordingForMs > 1200 && silenceForMs > 1400) {
          recorder.stop();
          return;
        }

        silenceFrameRef.current = requestAnimationFrame(detectSilence);
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

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
  }

  function pauseListening() {
    if (voiceState === "pausado") {
      void startListening();
      return;
    }

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setVoiceState("inativo");
    setIsBusy(false);
    addSessionEvent(setSessionMemory, "Sessão de voz encerrada.");
  }

  async function handleTextSubmit() {
    const value = input.trim();
    if (!value || isBusy) return;
    if (!activeProjectId) {
      setError("Selecione um projeto antes de enviar a mensagem.");
      return;
    }
    setInput("");
    await handleAssistantResponse(value, "text", false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleTextSubmit();
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
      <div className="workspace-card min-h-[calc(100vh-128px)] overflow-hidden">
        <div className="flex min-h-[calc(100vh-128px)] flex-col">
          <header className="border-b border-(--border) px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--accent)">{BRAND_NAME}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-medium text-(--text-primary)">Voice Room</h2>
                  <StatusPill tone="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-(--success)" />
                    Centro online
                  </StatusPill>
                </div>
                <p className="mt-2 max-w-xl text-[12px] text-(--text-secondary)">
                  Escolha o projeto que deve guiar o contexto desta conversa.
                </p>
              </div>

              <div className="w-full max-w-[480px] rounded-[1rem] border border-(--border) bg-(--bg-muted) p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-(--text-tertiary)">
                  Projeto em foco
                </p>
                <select
                  value={activeProjectId ?? ""}
                  onChange={(event) => void handleActivateProject(event.target.value)}
                  className="workspace-select mt-2 min-w-0 rounded-xl bg-white pr-10 text-[13px]"
                >
                  <option value="">Selecione um projeto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                  <p
                    className="min-w-0 truncate font-medium text-(--text-primary)"
                    title={activeProjectLabel}
                  >
                    {activeProjectLabel}
                  </p>
                  <span className="shrink-0 text-(--text-tertiary)">
                    {projects.length} projetos
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-(--text-secondary)">
                  Status: {activeProjectStatusLabel}
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[var(--color-background-tertiary)] px-5 py-5">
            <div className="mb-5 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--bg-surface) px-3 py-1 text-[11px] text-(--text-tertiary)">
                Hoje, {currentDateLabel}
              </span>
            </div>

            <div aria-live="polite" className="flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="workspace-empty-state px-4 py-5 text-center text-[13px] italic text-(--text-tertiary)">
                  Inicie uma conversa por voz ou digite sua mensagem para abrir o histórico operacional.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={[
                      "flex gap-3",
                      message.role === "assistant" ? "justify-start" : "justify-end",
                    ].join(" ")}
                  >
                    <div className={message.role === "assistant" ? "flex gap-3" : "flex flex-row-reverse gap-3"}>
                      <span
                        className={[
                          "inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11px] font-medium",
                          message.role === "assistant"
                            ? "bg-(--accent-soft) text-(--accent-strong)"
                            : "bg-(--accent) text-white",
                        ].join(" ")}
                      >
                        {message.role === "assistant" ? "7C" : userInitials}
                      </span>
                      <div className="max-w-[680px]">
                        <div
                          className={[
                            "px-4 py-3 text-[13px] leading-6",
                            message.role === "assistant"
                              ? "rounded-[4px_16px_16px_16px] border border-(--border) bg-(--bg-surface) text-(--text-primary)"
                              : "rounded-[16px_4px_16px_16px] bg-(--accent) text-white",
                          ].join(" ")}
                        >
                          {message.content}
                        </div>
                        <p className="mt-1 px-1 text-[10px] text-(--text-tertiary)">
                          {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-(--border) bg-(--bg-surface) px-5 py-4">
            <div className="relative flex items-center gap-4">
              {voiceUiState === "listening" ? (
                <div className="orb-ring-listening absolute -inset-2 rounded-full border border-(--border-strong)" />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (voiceState === "pausado") {
                    void startListening();
                    return;
                  }
                  if (voiceState === "ouvindo") {
                    pauseListening();
                    return;
                  }
                  void startListening();
                }}
                className={[
                  "relative flex h-16 w-16 items-center justify-center rounded-full border-2",
                  voiceUiState === "listening"
                    ? "orb-listening border-(--accent) bg-(--accent-soft) text-(--accent)"
                    : voiceUiState === "processing"
                      ? "border-(--success) bg-(--success-soft) text-(--success)"
                    : voiceUiState === "paused"
                        ? "border-[color:#B4B2A9] bg-(--bg-muted) text-(--text-secondary)"
                        : "border-(--border-strong) bg-(--accent-soft) text-(--accent-strong)",
                ].join(" ")}
                disabled={!activeProjectId || isBusy}
              >
                <VoiceGlyph state={voiceUiState} />
              </button>
              <div>
                <p className="text-[13px] font-medium text-(--text-primary)">{stateLabels.label}</p>
                <p className="text-[12px] text-(--text-secondary)">{stateLabels.sub}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={pauseListening}
                disabled={voiceState === "inativo" || isBusy}
                className="workspace-button-secondary px-3 py-2 text-[12px]"
              >
                {pauseLabel}
              </button>
              <button
                type="button"
                onClick={finishSession}
                className="workspace-button-danger px-3 py-2 text-[12px]"
              >
                Encerrar
              </button>
            </div>

            <div className="flex min-w-[220px] items-center gap-2">
              <input
                id="modo-continuo"
                type="checkbox"
                checked={continuousMode}
                onChange={(event) => setContinuousMode(event.target.checked)}
              />
              <label htmlFor="modo-continuo" className="text-[12px] text-(--text-secondary)">
                Modo contínuo (escuta novamente após responder)
              </label>
            </div>

            <div className="relative min-w-[280px] flex-1">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ou digite sua mensagem..."
                className="workspace-input rounded-full bg-(--bg-muted) pr-12 text-[13px]"
                disabled={!activeProjectId || isBusy}
              />
              <button
                type="button"
                onClick={() => void handleTextSubmit()}
                disabled={!activeProjectId || isBusy}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-(--accent) text-[12px] text-white"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="workspace-card min-h-[calc(100vh-128px)] overflow-y-auto p-4">
        <div className="space-y-4">
          <section>
            <SectionLabel>Contexto ativo</SectionLabel>
            <div className="mt-2 rounded-lg border border-[color:#9FE1CB] bg-(--success-soft) px-3 py-3">
              <p className="text-[12px] font-medium text-[color:#0F6E56]">
                {activeProject?.name ?? "Nenhum projeto ativo"}
              </p>
              <p className="mt-1 text-[11px] text-[color:#085041]">
                {projects.length} projetos · {messages.length} interações
              </p>
            </div>
          </section>

          <section>
            <SectionLabel>Memória da sessão</SectionLabel>
            <div className="space-y-2">
              {sessionMemory.length === 0 ? (
                <p className="mt-2 text-[12px] text-(--text-tertiary)">As ações da sessão aparecerão aqui em tempo real.</p>
              ) : (
                sessionMemory.map((entry) => (
                  <div key={entry} className="workspace-card-muted flex gap-2 px-3 py-2 text-[12px] text-(--text-primary)">
                    <span className="text-(--text-tertiary)">•</span>
                    <span>{entry}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionLabel>Ações rápidas</SectionLabel>
            <div className="space-y-2">
              <QuickAction href="/activities" label="Nova atividade" />
              <QuickAction href="/projects" label="Criar artefato" />
              <QuickAction href="/daily" label="Agendar daily" />
            </div>
          </section>

          {error ? (
            <section className="rounded-lg border border-[color:#F09595] bg-(--danger-soft) px-3 py-3 text-[12px] text-(--danger)">
              {error}
            </section>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="workspace-card-muted block px-3 py-2 text-[12px] text-(--text-primary)"
    >
      {label}
    </Link>
  );
}
