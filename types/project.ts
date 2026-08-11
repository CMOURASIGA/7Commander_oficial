export type ProjectStatus = "ativo" | "pausado" | "arquivado";

export type ProjectRecord = {
  id: string;
  userId: string;
  clientId: string | null;
  clientName: string | null;
  name: string;
  description: string;
  tags: string[];
  context: string;
  objective: string;
  stakeholders: string;
  maturity: string;
  status: ProjectStatus;
  isActive: boolean;
  createdAt: string;
};

export type CreateProjectInput = {
  userId: string;
  clientId?: string | null;
  name: string;
  description?: string;
  tags?: string[];
  context?: string;
  objective?: string;
  stakeholders?: string;
  maturity?: string;
  status?: ProjectStatus;
  isActive?: boolean;
};

export type ResolveProjectResult = {
  project: ProjectRecord | null;
  confidence: number;
  action: "created" | "reused" | "suggest_new" | "none";
  suggestedName?: string;
  reasoning: string;
};
