"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { isPgError } from "@/lib/db";
import { countClientLinks, deleteClient, insertClient, updateClient } from "@/lib/data/clients";
import type { ActionState } from "@/components/action-form";

const optional = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v));

const clientSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(120, "Nome muito longo (máx. 120)"),
  phone: optional,
  email: optional,
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === "" ? null : v)),
});

function parse(formData: FormData) {
  return clientSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createClientAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let id: string;
  try {
    id = await insertClient(parsed.data);
  } catch {
    return { error: "Não foi possível criar o cliente" };
  }

  redirect(`/painel/clientes/${id}`);
}

export async function updateClientAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Cliente inválido" };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await updateClient(id.data, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o cliente" };
  }

  revalidatePath(`/painel/clientes/${id.data}`);
  return { ok: "Cliente salvo" };
}

export async function deleteClientAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Cliente inválido" };

  const count = await countClientLinks(id.data);
  if (count > 0) {
    return {
      error: `Não é possível excluir: este cliente tem ${count} plaquinha(s) vinculada(s). Desvincule ou altere o cliente das plaquinhas primeiro.`,
    };
  }

  try {
    await deleteClient(id.data);
  } catch (e) {
    if (isPgError(e) && e.code === "23503") {
      return { error: "Não é possível excluir: este cliente tem plaquinhas vinculadas." };
    }
    return { error: "Não foi possível excluir o cliente" };
  }
  redirect("/painel/clientes");
}
