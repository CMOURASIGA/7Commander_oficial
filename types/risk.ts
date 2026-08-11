export type RiskStatus = "aberto" | "em_mitigacao" | "mitigado" | "encerrado";

export type RiskRecord = {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  impact: string;
  probability: string;
  mitigation: string;
  owner: string;
  status: RiskStatus;
  decisionId: string | null;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRiskInput = {
  userId: string;
  projectId: string;
  title: string;
  impact?: string;
  probability?: string;
  mitigation?: string;
  owner?: string;
  status?: RiskStatus;
  decisionId?: string | null;
  taskId?: string | null;
};
