export type SpecialistId = "core" | "general" | "pm" | "study" | "translate" | "tech" | "writer" | "research";
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  specialist: SpecialistId;
  createdAt: string;
};

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: string;
  projectId: string | null;
  projectName: string | null;
};

export type ChatPayload = {
  message: string;
  conversationId: string;
  selectedSpecialist?: SpecialistId;
  projectId?: string | null;
};
