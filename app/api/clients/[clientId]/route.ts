import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { deleteClient, getClientById, updateClient } from "@/services/client-service";
import { ClientStatus } from "@/types/client";

type UpdateClientPayload = {
  name?: string;
  description?: string;
  contact?: string;
  status?: ClientStatus;
};

function isValidStatus(value?: string): value is ClientStatus {
  return value === undefined || value === "ativo" || value === "inativo";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { clientId } = await context.params;
    const client = await getClientById({
      userId: auth.context.organizationId,
      clientId: clientId.trim(),
    });
    if (!client) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    return NextResponse.json({ data: client });
  } catch (error) {
    console.error("[/api/clients/[clientId]] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar cliente." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as UpdateClientPayload;
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de cliente invalido." }, { status: 400 });
    }

    const { clientId } = await context.params;
    const updated = await updateClient({
      userId: auth.context.organizationId,
      clientId: clientId.trim(),
      patch: {
        name: body.name,
        description: body.description,
        contact: body.contact,
        status: body.status,
      },
    });
    if (!updated) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[/api/clients/[clientId]] PATCH error", error);
    return NextResponse.json({ error: "Erro ao atualizar cliente." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { clientId } = await context.params;
    const deleted = await deleteClient({
      userId: auth.context.organizationId,
      clientId: clientId.trim(),
    });
    if (!deleted) return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/clients/[clientId]] DELETE error", error);
    return NextResponse.json({ error: "Erro ao remover cliente." }, { status: 500 });
  }
}
