import { expect, Page, test } from "@playwright/test";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function safeGoto(path: string, page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(1500);
    }
  }
}

test.describe("US-039 fluxo completo", () => {
  test("projeto + kairos + kanban + compartilhamento", async ({ page }) => {
    const suffix = uniqueSuffix();
    const projectName = `Projeto E2E ${suffix}`;
    const taskName = `Card E2E ${suffix}`;
    const inviteEmail = `viewer.${suffix}@example.com`;

    await safeGoto("/projects", page);
    await expect(page.getByRole("heading", { name: "Projetos e Decisoes" })).toBeVisible();

    await page.getByPlaceholder("Novo projeto (ex.: IA para restaurantes)").fill(projectName);
    await page.getByRole("button", { name: "Criar projeto" }).click();
    await expect(page.getByRole("button", { name: new RegExp(projectName) })).toBeVisible();

    await page.getByPlaceholder("email@empresa.com").fill(inviteEmail);
    await page.locator("select").filter({ has: page.locator("option[value='viewer']") }).first().selectOption("viewer");
    await page.getByRole("button", { name: "Convidar" }).click();
    await expect(page.getByText(inviteEmail)).toBeVisible();

    await safeGoto("/chat", page);
    await expect(page.getByRole("heading", { name: "Chat Kairos" })).toBeVisible();

    await page.getByPlaceholder("Escreva sua mensagem...").fill(
      `Kairos, cria tarefa "${taskName}" no projeto "${projectName}" em TO DO.`,
    );
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(`Tarefa criada: "${taskName}"`)).toBeVisible({ timeout: 30000 });

    await page.getByPlaceholder("Escreva sua mensagem...").fill(
      `Kairos, mover tarefa "${taskName}" para DOING no projeto "${projectName}".`,
    );
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(`Tarefa "${taskName}" movida para DOING.`)).toBeVisible({ timeout: 30000 });

    await safeGoto("/activities", page);
    await expect(page.getByRole("heading", { name: "Atividades" })).toBeVisible();
    const projectSelect = page.locator("select").first();
    const projectOption = projectSelect.locator("option", { hasText: projectName }).first();
    await expect(projectOption).toBeVisible();
    const projectValue = await projectOption.getAttribute("value");
    if (!projectValue) {
      throw new Error(`Nao foi possivel resolver option para o projeto ${projectName}.`);
    }
    await projectSelect.selectOption(projectValue);

    const doingColumn = page.locator("article").filter({
      has: page.getByRole("heading", { name: "DOING" }),
    }).first();
    await expect(doingColumn.getByText(taskName)).toBeVisible({ timeout: 20000 });

    await doingColumn.getByRole("button", { name: new RegExp(taskName) }).click();
    await expect(page.getByText(`Card: ${taskName}`)).toBeVisible();
    await expect(page.getByText("Card movido para DOING.")).toBeVisible();
  });
});
