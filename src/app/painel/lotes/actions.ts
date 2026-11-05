"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createBatch } from "@/lib/data/batches";
import { KIND_IDS } from "@/lib/kinds";
import type { ActionState } from "@/components/action-form";

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome do lote").max(120, "Nome muito longo (máx. 120)"),
  quantity: z.coerce
    .number()
    .int("A quantidade deve ser um número inteiro")
    .min(1, "A quantidade mínima é 1")
    .max(500, "A quantidade máxima é 500"),
  kind: z.string().refine((k) => KIND_IDS.includes(k), "Tipo inválido"),
  request_id: z.string().uuid("Requisição inválida, recarregue a página"),
});

export async function createBatchAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    quantity: formData.get("quantity") ?? "",
    kind: formData.get("kind") ?? "outro",
    request_id: formData.get("request_id") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let id: string | undefined;
  try {
    id = await createBatch({
      quantity: parsed.data.quantity,
      name: parsed.data.name,
      kind: parsed.data.kind,
      requestId: parsed.data.request_id,
    });
  } catch {
    return { error: "Não foi possível criar o lote" };
  }
  if (!id) return { error: "Não foi possível criar o lote" };

  redirect(`/painel/lotes/${id}`);
}
