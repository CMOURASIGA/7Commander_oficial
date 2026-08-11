import { expect, Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function safeGoto(route: string, page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(1500);
    }
  }
}

async function apiJson<T>(page: Page, endpoint: string): Promise<T> {
  const response = await page.request.get(endpoint);
  expect(response.ok(), `GET ${endpoint} falhou`).toBeTruthy();
  return (await response.json()) as T;
}

async function apiPatch(page: Page, endpoint: string, payload: unknown): Promise<void> {
  const response = await page.request.patch(endpoint, {
    data: payload,
  });
  expect(response.ok(), `PATCH ${endpoint} falhou`).toBeTruthy();
}

async function apiPostJson<T>(page: Page, endpoint: string, payload: unknown): Promise<T> {
  const response = await page.request.post(endpoint, { data: payload });
  expect(response.ok(), `POST ${endpoint} falhou`).toBeTruthy();
  return (await response.json()) as T;
}

async function apiPatchJson<T>(page: Page, endpoint: string, payload: unknown): Promise<T> {
  const response = await page.request.patch(endpoint, { data: payload });
  expect(response.ok(), `PATCH ${endpoint} falhou`).toBeTruthy();
  return (await response.json()) as T;
}

async function apiPostMultipart<T>(
  page: Page,
  endpoint: string,
  multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>,
): Promise<T> {
  const response = await page.request.post(endpoint, { multipart });
  expect(response.ok(), `POST multipart ${endpoint} falhou`).toBeTruthy();
  return (await response.json()) as T;
}

type BoardPayload = {
  data: {
    columns: Array<{
      id: string;
      key: "todo" | "doing" | "done";
      cards: Array<{ id: string; title: string }>;
    }>;
  };
};

type EntityPayload<T> = { data: T };
type ProjectsPayload = { data: Array<{ id: string; name: string }> };
type ClientsPayload = { data: Array<{ id: string; name: string }> };
type ActiveProjectPayload = { data: { id: string | null } };
type BoardAccessPayload = {
  meta?: {
    accessRole?: "owner" | "editor" | "viewer" | "none";
  };
};
type KnowledgePayload = {
  data: Array<{
    id: string;
    title: string;
    category: string | null;
    source: string | null;
    projectId: string | null;
  }>;
};
type ChatPayload = {
  data: {
    conversationId: string;
    specialist: string;
    message: {
      id: string;
      content: string;
      role: string;
    };
  };
};

test.describe("US-041 fluxo principal V2", () => {
  test("cliente + projeto + decisao + risco + ingestao + chat + kanban + home", async ({ page }) => {
    const suffix = uniqueSuffix();
    const clientName = `Cliente V2 ${suffix}`;
    const projectName = `Projeto V2 ${suffix}`;
    const decisionTitle = `Decisao V2 ${suffix}`;
    const riskTitle = `Risco V2 ${suffix}`;
    const taskName = `Atividade V2 ${suffix}`;
    const chatTaskName = `Task via chat ${suffix}`;
    const ingestTitle = `us041-ingestao-${suffix}.txt`;
    const conversationId = `us041-${suffix}`;

    const createdClient = await apiPostJson<EntityPayload<{ id: string; name: string }>>(page, "/api/clients", {
      name: clientName,
      description: "Cliente criado automaticamente pela suite E2E US-041.",
      contact: "ops@example.com",
      status: "ativo",
    });

    expect(createdClient.data.name).toContain(clientName);

    const clientsList = await apiJson<ClientsPayload>(page, "/api/clients");
    expect(clientsList.data.some((client) => client.id === createdClient.data.id)).toBeTruthy();

    const createdProject = await apiPostJson<EntityPayload<{ id: string; name: string }>>(page, "/api/projects", {
      clientId: createdClient.data.id,
      name: projectName,
      description: "Projeto criado automaticamente pela suite E2E US-041.",
      status: "ativo",
      isActive: true,
      tags: ["e2e", "us-041"],
    });
    const projectId = createdProject.data.id;

    const activeProject = await apiPatchJson<ActiveProjectPayload>(page, "/api/projects/active", {
      projectId,
    });
    expect(activeProject.data.id).toBe(projectId);

    const projectsPayload = await apiJson<ProjectsPayload>(page, "/api/projects");
    const selectedProject = projectsPayload.data.find((project) => project.id === projectId) ?? null;
    expect(selectedProject, "Projeto criado nao encontrado no /api/projects.").toBeDefined();
    if (!selectedProject) return;

    await apiPostJson<EntityPayload<{ id: string }>>(page, `/api/projects/${projectId}/decisions`, {
      title: decisionTitle,
      context: "Decisao registrada no projeto ativo para rastreabilidade.",
      reason: "Necessario para o fluxo principal.",
      impact: "Acelerar execucao.",
      status: "aberta",
    });

    await apiPostJson<EntityPayload<{ id: string }>>(page, `/api/projects/${projectId}/risks`, {
      title: riskTitle,
      owner: "time.ops@example.com",
      impact: "Alto",
      probability: "Media",
      mitigation: "Revisao semanal com responsavel definido.",
      status: "aberto",
    });

    await apiPostJson<EntityPayload<{ id: string }>>(page, `/api/projects/${projectId}/tasks`, {
      title: taskName,
      description: "Card criado pela suite E2E US-041.",
      columnKey: "todo",
      priority: "media",
    });

    const fixturePath = path.resolve(process.cwd(), "tests/e2e/fixtures/us041_ingestao.txt");
    const fixtureBuffer = await readFile(fixturePath);
    const ingested = await apiPostMultipart<EntityPayload<{ title: string; summary: string }>>(page, "/api/knowledge/ingest", {
      projectId,
      notes: "Ingestao automatizada da suite E2E US-041.",
      file: {
        name: ingestTitle,
        mimeType: "text/plain",
        buffer: fixtureBuffer,
      },
    });
    expect(ingested.data.title).toBe(ingestTitle);
    expect(ingested.data.summary.length).toBeGreaterThan(30);

    const knowledgeItems = await apiJson<KnowledgePayload>(page, `/api/knowledge?projectId=${projectId}`);
    expect(knowledgeItems.data.some((item) => item.title === ingestTitle)).toBeTruthy();

    const chatResponse = await apiPostJson<ChatPayload>(page, "/api/chat", {
      conversationId,
      projectId,
      selectedSpecialist: "core",
      message: `criar tarefa "${chatTaskName}" em doing`,
    });
    expect(chatResponse.data.conversationId).toBe(conversationId);
    expect(chatResponse.data.message.role).toBe("assistant");
    expect(chatResponse.data.message.content).toContain("Tarefa criada");

    await safeGoto("/activities", page);
    await expect(page.getByRole("heading", { name: "Atividades" })).toBeVisible();
    const projectSelect = page.locator("select").first();
    const projectOptionValue = await projectSelect.evaluate((element, targetName) => {
      const select = element as HTMLSelectElement;
      const option = Array.from(select.options).find((item) => item.textContent?.includes(targetName));
      return option?.value ?? "";
    }, projectName);
    expect(projectOptionValue).not.toBe("");
    await projectSelect.selectOption(projectOptionValue);

    const boardPayload = await apiJson<BoardPayload>(page, `/api/projects/${projectId}/tasks`);
    const boardAccess = (await page.request
      .get(`/api/projects/${projectId}/tasks`)
      .then((response) => response.json().catch(() => null))) as BoardAccessPayload | null;
    expect(boardAccess?.meta?.accessRole === "owner" || boardAccess?.meta?.accessRole === "editor").toBeTruthy();
    const doingColumn = boardPayload.data.columns.find((column) => column.key === "doing");
    const taskCard = boardPayload.data.columns.flatMap((column) => column.cards).find((card) => card.title === taskName);
    const chatTaskCard = boardPayload.data.columns.flatMap((column) => column.cards).find((card) => card.title === chatTaskName);
    expect(doingColumn, "Coluna DOING nao encontrada.").toBeDefined();
    expect(taskCard, "Card recem-criado nao encontrado.").toBeDefined();
    expect(chatTaskCard, "Card criado via chat nao encontrado.").toBeDefined();
    if (!doingColumn || !taskCard) return;

    await apiPatch(page, `/api/tasks/${taskCard.id}`, {
      columnId: doingColumn.id,
      position: doingColumn.cards.length,
    });

    await page.getByRole("button", { name: "Atualizar" }).click();
    const doingColumnUi = page.locator("article").filter({
      has: page.getByRole("heading", { name: "DOING" }),
    }).first();
    await expect(doingColumnUi.getByText(taskName)).toBeVisible();
    await expect(doingColumnUi.getByText(chatTaskName)).toBeVisible();

    await safeGoto("/projects", page);
    await expect(page.getByRole("heading", { name: "Projetos e Decisoes" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(projectName) })).toBeVisible();
    await expect(page.getByText(decisionTitle)).toBeVisible();
    await expect(page.getByText(riskTitle)).toBeVisible();

    await safeGoto("/", page);
    await expect(page.getByRole("heading", { name: "Home Operacional" })).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByText("Decisões abertas")).toBeVisible();
    await expect(page.getByText("Riscos ativos")).toBeVisible();
  });
});
