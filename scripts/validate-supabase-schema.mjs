import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1);
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function tableSelectFromSpec(spec) {
  const [table, select] = spec.split(":");
  return { table, select };
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Variaveis ausentes: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const checks = [
    "clients:id,user_id,nome,descricao,contato,status,created_at,updated_at",
    "projects:id,user_id,nome,descricao,status,created_at",
    "projects:id,client_id",
    "decisions:id,user_id,titulo,contexto,motivo,impacto,status,project_id,conversation_id,artifact_id,updated_at,created_at",
    "decision_status_history:id,decision_id,user_id,previous_status,new_status,source,note,created_at",
    "projects:id,ativo,tags,contexto,objetivo,stakeholders,maturidade",
    "knowledge_base:id,project_id,titulo,categoria,fonte,conteudo",
    "knowledge_chunks:id,knowledge_id,project_id,chunk_index,conteudo",
    "knowledge_embeddings:id,chunk_id,project_id,embedding",
    "tasks:id,project_id,board_id,column_id,position,updated_at",
    "task_boards:id,project_id,name",
    "task_columns:id,board_id,column_key,title,position",
    "task_labels:id,task_id,name,color",
    "task_members:id,task_id,member_email,role",
    "task_checklists:id,task_id,title,position",
    "task_checklist_items:id,checklist_id,task_id,content,done,position",
    "task_comments:id,task_id,author_email,content",
    "task_attachments:id,task_id,file_name,file_url",
    "task_activity_log:id,task_id,action_type,action_detail,metadata",
    "risks:id,user_id,project_id,decision_id,task_id,titulo,impacto,probabilidade,mitigacao,responsavel,status,updated_at",
    "kairos_profiles:user_id,instructions,knowledge,icebreakers,updated_at",
    "task_daily_selections:task_id,user_id,project_id,selected_at",
  ];

  let hasFailure = false;
  for (const spec of checks) {
    const { table, select } = tableSelectFromSpec(spec);
    const { error } = await supabase.from(table).select(select).limit(1);
    if (error) {
      hasFailure = true;
      console.log(`[ERRO] ${table}: ${error.code ?? "NO_CODE"} - ${error.message}`);
    } else {
      console.log(`[OK]   ${table}`);
    }
  }

  if (hasFailure) {
    console.log("\nDiagnostico: schema incompleto para fluxo voice-first + atividades.");
    console.log("Aplique as migrations pendentes no Supabase SQL Editor, incluindo 044_kairos_profiles.sql e 045_task_daily_selections.sql.");
    process.exit(2);
  }

  console.log("\nSchema validado com sucesso para as rotinas de projetos, conhecimento e atividades.");
}

void main();
