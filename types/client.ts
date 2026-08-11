export type ClientStatus = "ativo" | "inativo";

export type ClientRecord = {
  id: string;
  userId: string;
  name: string;
  description: string;
  contact: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateClientInput = {
  userId: string;
  name: string;
  description?: string;
  contact?: string;
  status?: ClientStatus;
};

export type UpdateClientInput = {
  userId: string;
  clientId: string;
  patch: Partial<Pick<ClientRecord, "name" | "description" | "contact" | "status">>;
};
