import fs from "node:fs/promises";
import path from "node:path";

export type CapabilityModuleId =
  | "pm_partner"
  | "planning"
  | "decision"
  | "study"
  | "translation"
  | "technical"
  | "writing"
  | "bpmn"
  | "status_report"
  | "storyboard";

type ModuleSelection = {
  id: CapabilityModuleId;
  prompt: string;
};

const MODULE_PATHS: Record<CapabilityModuleId, string[]> = {
  pm_partner: [
    path.join(process.cwd(), "inteligencia/PM Partner"),
  ],
  planning: [
    path.join(process.cwd(), "prompts/modules/planning.md"),
  ],
  decision: [
    path.join(process.cwd(), "prompts/modules/decision.md"),
  ],
  study: [
    path.join(process.cwd(), "prompts/modules/study.md"),
  ],
  translation: [
    path.join(process.cwd(), "prompts/modules/translation.md"),
  ],
  technical: [
    path.join(process.cwd(), "prompts/modules/technical.md"),
  ],
  writing: [
    path.join(process.cwd(), "prompts/modules/writing.md"),
  ],
  bpmn: [
    path.join(process.cwd(), "inteligencia/BPMN Master Architect"),
    path.join(process.cwd(), "prompts/modules/bpmn.md"),
  ],
  status_report: [
    path.join(process.cwd(), "inteligencia/Status Report Executive Architect"),
  ],
  storyboard: [
    path.join(process.cwd(), "inteligencia/Storyboard Intelligence Architect"),
  ],
};

const CORE_PROMPT_PATHS = [path.join(process.cwd(), "prompts/core/pm-ai-partner.md")];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pickModulesByIntent(message: string): CapabilityModuleId[] {
  const input = normalizeText(message);
  const selected = new Set<CapabilityModuleId>(["pm_partner", "planning"]);

  if (/(decisao|risko|risco|impacto|trade-off|governanca)/.test(input)) selected.add("decision");
  if (/(estudar|resumo|prova|didat|explicar)/.test(input)) selected.add("study");
  if (/(traduz|translation|ingles|espanhol|idioma)/.test(input)) selected.add("translation");
  if (/(codigo|api|bug|arquitetura|deploy|stack|tecnico)/.test(input)) selected.add("technical");
  if (/(escrever|texto|post|artigo|copy)/.test(input)) selected.add("writing");
  if (/(bpmn|processo|fluxo|gateway|evento)/.test(input)) selected.add("bpmn");
  if (/(status report|relatorio|dashboard|kanban|indicador|apresentacao executiva)/.test(input)) {
    selected.add("status_report");
  }
  if (/(storyboard|transcricao|ata|leitura estruturada|insumo bruto|documento bruto)/.test(input)) {
    selected.add("storyboard");
  }

  return Array.from(selected);
}

async function safeReadFile(filePath: string): Promise<string> {
  try {
    return (await fs.readFile(filePath, "utf-8")).trim();
  } catch {
    return "";
  }
}

export async function loadCorePrompt(): Promise<string> {
  const parts: string[] = [];
  for (const filePath of CORE_PROMPT_PATHS) {
    const prompt = await safeReadFile(filePath);
    if (prompt) parts.push(prompt);
  }
  if (parts.length) return parts.join("\n\n");

  return [
    "Voce e o Kairos Core: uma inteligencia operacional central, contextual e orientada a projetos.",
    "A voz e interface principal, o texto e modo de apoio/auditoria.",
    "Responda com clareza, objetividade e foco em decisao e execucao.",
  ].join(" ");
}

export async function loadCapabilityModulesForMessage(message: string): Promise<ModuleSelection[]> {
  const selectedIds = pickModulesByIntent(message);
  const result: ModuleSelection[] = [];

  for (const id of selectedIds) {
    for (const modulePath of MODULE_PATHS[id]) {
      const prompt = await safeReadFile(modulePath);
      if (prompt) {
        result.push({ id, prompt });
        break;
      }
    }
  }

  return result;
}
