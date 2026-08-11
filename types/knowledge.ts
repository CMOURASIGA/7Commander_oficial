export type KnowledgeRecord = {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  category: string;
  source: string;
  content: string;
  createdAt: string;
};

