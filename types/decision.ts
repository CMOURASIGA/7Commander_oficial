export type DecisionStatus = "aberta" | "em_andamento" | "concluida" | "cancelada";

export type Decision = {
  id: string;
  userId: string;
  title: string;
  context: string;
  reason: string;
  impact: string;
  status: DecisionStatus;
  projectId: string | null;
  conversationId: string | null;
  artifactId: string | null;
  createdAt: string;
};

export type DecisionStatusHistoryItem = {
  id: string;
  decisionId: string;
  userId: string;
  previousStatus: DecisionStatus | null;
  newStatus: DecisionStatus;
  source: string;
  note: string;
  createdAt: string;
};

export type CreateDecisionInput = {
  userId: string;
  title: string;
  context?: string;
  reason?: string;
  impact?: string;
  status?: DecisionStatus;
  projectId?: string | null;
  conversationId?: string | null;
  artifactId?: string | null;
  source?: string;
  note?: string;
};
