import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectById } from "@/services/project-service";

export type ProjectRole = "owner" | "editor" | "viewer";

export type ProjectMemberRecord = {
  id: string;
  projectId: string;
  memberUserId: string | null;
  memberEmail: string;
  role: ProjectRole;
  status: "invited" | "active" | "revoked";
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  member_user_id: string | null;
  member_email: string;
  role: ProjectRole;
  status: "invited" | "active" | "revoked";
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapMemberRow(row: ProjectMemberRow): ProjectMemberRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    memberUserId: row.member_user_id,
    memberEmail: row.member_email,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureProjectOwnerMembership(params: {
  ownerUserId: string;
  ownerEmail?: string | null;
  projectId: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  const email = params.ownerEmail?.trim().toLowerCase();
  if (!email) return;

  await supabase.from("project_members").upsert(
    {
      project_id: params.projectId,
      member_user_id: params.ownerUserId,
      member_email: email,
      role: "owner",
      status: "active",
      invited_by: params.ownerUserId,
      accepted_at: new Date().toISOString(),
    },
    {
      onConflict: "project_id,member_email",
    },
  );
}

export async function listProjectMembers(params: {
  userId: string;
  userEmail?: string | null;
  projectId: string;
}): Promise<ProjectMemberRecord[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const project = await getProjectById({
    userId: params.userId,
    userEmail: params.userEmail,
    projectId: params.projectId,
  });

  if (!project) return [];

  const result = await supabase
    .from("project_members")
    .select("id, project_id, member_user_id, member_email, role, status, invited_by, invited_at, accepted_at, created_at, updated_at")
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: true });

  if (result.error || !result.data) return [];
  return (result.data as ProjectMemberRow[]).map(mapMemberRow);
}

export async function inviteProjectMember(params: {
  ownerUserId: string;
  ownerEmail?: string | null;
  projectId: string;
  memberEmail: string;
  role: ProjectRole;
}): Promise<ProjectMemberRecord> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase indisponivel para compartilhamento de projeto.");
  }

  const project = await getProjectById({
    userId: params.ownerUserId,
    userEmail: params.ownerEmail,
    projectId: params.projectId,
  });
  if (!project || project.userId !== params.ownerUserId) {
    throw new Error("Projeto nao encontrado ou sem permissao de compartilhamento.");
  }

  await ensureProjectOwnerMembership({
    ownerUserId: params.ownerUserId,
    ownerEmail: params.ownerEmail,
    projectId: params.projectId,
  });

  const email = params.memberEmail.trim().toLowerCase();
  if (!email) {
    throw new Error("Email do membro obrigatorio.");
  }

  const inserted = await supabase
    .from("project_members")
    .upsert(
      {
        project_id: params.projectId,
        member_email: email,
        role: params.role,
        status: "invited",
        invited_by: params.ownerUserId,
      },
      { onConflict: "project_id,member_email" },
    )
    .select("id, project_id, member_user_id, member_email, role, status, invited_by, invited_at, accepted_at, created_at, updated_at")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message || "Falha ao convidar membro para projeto.");
  }

  return mapMemberRow(inserted.data as ProjectMemberRow);
}

export async function revokeProjectMember(params: {
  ownerUserId: string;
  ownerEmail?: string | null;
  projectId: string;
  memberId: string;
}): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return false;

  const project = await getProjectById({
    userId: params.ownerUserId,
    userEmail: params.ownerEmail,
    projectId: params.projectId,
  });
  if (!project || project.userId !== params.ownerUserId) return false;

  const updated = await supabase
    .from("project_members")
    .update({ status: "revoked" })
    .eq("id", params.memberId)
    .eq("project_id", params.projectId)
    .neq("role", "owner")
    .select("id")
    .single();

  return !updated.error && Boolean(updated.data?.id);
}
