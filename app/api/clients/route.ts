import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { createClient, listClients } from "@/services/client-service";
import { ClientStatus } from "@/types/client";

type CreateClientPayload = {
  name: string;
  description?: string;
  contact?: string;
  status?: ClientStatus;
};

function isValidStatus(value?: string): value is ClientStatus {
  return value === undefined || value === "ativo" || value === "inativo";
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const clients = await listClients(auth.context.organizationId);
    return NextResponse.json({ data: clients });
  } catch (error) {
    console.error("[/api/clients] GET error", error);
    return NextResponse.json({ error: "Erro ao listar clientes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as CreateClientPayload;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Campo 'name' obrigatorio." }, { status: 400 });
    }
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de cliente invalido." }, { status: 400 });
    }

    const created = await createClient({
      userId: auth.context.organizationId,
      name: body.name.trim(),
      description: body.description,
      contact: body.contact,
      status: body.status ?? "ativo",
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[/api/clients] POST error", error);
    return NextResponse.json({ error: "Erro ao criar cliente." }, { status: 500 });
  }
}
