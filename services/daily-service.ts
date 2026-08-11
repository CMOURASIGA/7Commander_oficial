import { getSupabaseServerClient } from "@/lib/supabase/server";

export type DailyTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: "baixa" | "media" | "alta" | "critica";
  status: "aberta" | "em_andamento" | "concluida";
  responsible: string | null;
  dueDate: string | null;
  selectedAt: string;
};

export type DailySnapshot = {
  tasks: DailyTask[];
};

function normalizePriority(value: string): DailyTask["priority"] {
  if (value === "baixa" || value === "alta" || value === "critica") return value;
  return "media";
}

function normalizeStatus(value: string): DailyTask["status"] {
  if (value === "concluida" || value === "em_andamento") return value;
  return "aberta";
}

export async function getDailySnapshot(userId: string): Promise<DailySnapshot> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { tasks: [] };

  const selections = await supabase
    .from("task_daily_selections")
    .select("task_id, selected_at")
    .eq("user_id", userId)
    .order("selected_at", { ascending: true })
    .limit(100);
  if (selections.error || !selections.data?.length) return { tasks: [] };

  const taskIds = selections.data.map((item) => item.task_id);
  const tasksResult = await supabase
    .from("tasks")
    .select("id, project_id, titulo, descricao, prioridade, status, responsavel, due_date")
    .in("id", taskIds);
  if (tasksResult.error || !tasksResult.data) return { tasks: [] };

  const selectedAtByTaskId = new Map(selections.data.map((item) => [item.task_id, item.selected_at]));
  const tasksById = new Map(tasksResult.data.map((item) => [item.id, item]));
  const tasks = taskIds.flatMap((taskId) => {
    const task = tasksById.get(taskId);
    if (!task) return [];
    return [{
      id: task.id,
      projectId: task.project_id,
      title: task.titulo,
      description: task.descricao ?? "",
      priority: normalizePriority(task.prioridade),
      status: normalizeStatus(task.status),
      responsible: task.responsavel ?? null,
      dueDate: task.due_date ?? null,
      selectedAt: selectedAtByTaskId.get(taskId) ?? "",
    }];
  });

  return { tasks };
}
