import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { revokeProjectMember } from "@/services/project-sharing-service";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; memberId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { projectId, memberId } = await context.params;
    const revoked = await revokeProjectMember({
      ownerUserId: auth.context.organizationId,
      ownerEmail: auth.context.userEmail,
      projectId: projectId.trim(),
      memberId: memberId.trim(),
    });

    if (!revoked) {
      return NextResponse.json({ error: "Membro nao encontrado ou sem permissao." }, { status: 404 });
    }

    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    console.error("[/api/projects/[projectId]/members/[memberId]] DELETE error", error);
    return NextResponse.json({ error: "Erro ao revogar membro." }, { status: 500 });
  }
}
