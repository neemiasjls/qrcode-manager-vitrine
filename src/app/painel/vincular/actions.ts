"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { assignLink, BusinessError } from "@/lib/data/links";
import { validateDestination } from "@/lib/url";
import { KIND_IDS } from "@/lib/kinds";
import type { ActionState } from "@/components/action-form";

export async function assignLinkAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Plaquinha inválida" };

  const kind = String(formData.get("kind") ?? "outro");
  if (!KIND_IDS.includes(kind)) return { error: "Tipo inválido" };

  const d = validateDestination(String(formData.get("destination_url") ?? ""));
  if (!d.ok) return { error: d.reason };

  const label = String(formData.get("label") ?? "").trim() || null;
  if (label && label.length > 120) return { error: "Rótulo muito longo (máx. 120)" };

  let clientId: string | null = null;
  let newClientName: string | null = null;
  const existing = String(formData.get("client_id") ?? "").trim();
  const newName = String(formData.get("new_client_name") ?? "").trim();
  if (existing) {
    if (!z.string().uuid().safeParse(existing).success) return { error: "Cliente inválido" };
    clientId = existing;
  } else if (newName) {
    if (newName.length > 120) return { error: "Nome do cliente muito longo (máx. 120)" };
    newClientName = newName;
  } else {
    return { error: "Escolha um cliente existente ou informe o nome de um novo cliente" };
  }

  try {
    await assignLink({ id: id.data, clientId, newClientName, destination: d.url, kind, label });
  } catch (e) {
    if (e instanceof BusinessError) return { error: e.message };
    return { error: "Não foi possível vincular a plaquinha" };
  }

  redirect(`/painel/plaquinhas/${id.data}`);
}
