import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  ProjectRole,
  inviteProjectMember,
  listProjectMembers,
} from "@/services/project-sharing-service";
import { getProjectById } from "@/services/project-service";

type InviteMemberPayload = {
  email?: string;
  role?: ProjectRole;
};

function isValidRole(value: string): value is ProjectRole {
  return value === "owner" || value === "editor" || value === "viewer";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { projectId } = await context.params;
    const project = await getProjectById({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
    });
    if (!project) {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }

    const members = await listProjectMembers({
      userId: auth.context.organizationId,
      userEmail: auth.context.userEmail,
      projectId: project.id,
    });

    return NextResponse.json({
      data: members,
      meta: {
        canManageMembers: project.userId === auth.context.organizationId,
      },
    });
  } catch (error) {
    console.error("[/api/projects/[projectId]/members] GET error", error);
    return NextResponse.json({ error: "Erro ao listar membros do projeto." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as InviteMemberPayload;
    const email = body.email?.trim().toLowerCase() ?? "";
    const role = body.role ?? "viewer";
    if (!email) {
      return NextResponse.json({ error: "Campo 'email' obrigatorio." }, { status: 400 });
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Role invalida. Use owner, editor ou viewer." }, { status: 400 });
    }

    const { projectId } = await context.params;
    const member = await inviteProjectMember({
      ownerUserId: auth.context.organizationId,
      ownerEmail: auth.context.userEmail,
      projectId: projectId.trim(),
      memberEmail: email,
      role,
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("[/api/projects/[projectId]/members] POST error", error);
    const message = error instanceof Error ? error.message : "Erro ao convidar membro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
