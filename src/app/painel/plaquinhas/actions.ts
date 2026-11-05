"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { isPgError } from "@/lib/db";
import {
  changeSlug,
  createLink,
  isSlugTaken,
  markPrintedMany,
  markPrintedOne,
  updateLink,
} from "@/lib/data/links";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { validateDestination } from "@/lib/url";
import { isProvisionalBaseUrl } from "@/lib/env";
import { KIND_IDS } from "@/lib/kinds";
import type { ActionState } from "@/components/action-form";

const uuid = z.string().uuid();
const STATUSES = ["unassigned", "active", "paused", "archived"] as const;

/** Traduz erros do banco relacionados a slug em mensagens amigáveis. */
function slugErrorMessage(error: unknown): string {
  if (isPgError(error)) {
    if (error.code === "23505") return "Esse link já está em uso";
    if (error.message?.includes("slug_reserved")) return "Esse link é reservado e não pode ser usado";
    if (error.code === "23514") return "Formato de link inválido";
  }
  return "Não foi possível salvar o link";
}

function optionalText(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function optionalUuid(v: FormDataEntryValue | null): string | null {
  const s = optionalText(v);
  if (!s) return null;
  return uuid.safeParse(s).success ? s : null;
}

export async function createLinkAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const kind = String(formData.get("kind") ?? "outro");
  if (!KIND_IDS.includes(kind)) return { error: "Tipo inválido" };

  const rawSlug = String(formData.get("slug") ?? "").trim();
  let slug: string | null = null;
  if (rawSlug !== "") {
    slug = normalizeSlug(rawSlug);
    const v = validateSlug(slug);
    if (!v.ok) return { error: v.reason };
  }

  let destination: string | null = null;
  const rawDest = String(formData.get("destination_url") ?? "").trim();
  if (rawDest !== "") {
    const d = validateDestination(rawDest);
    if (!d.ok) return { error: d.reason };
    destination = d.url;
  }

  const label = optionalText(formData.get("label"));
  if (label && label.length > 120) return { error: "Rótulo muito longo (máx. 120)" };

  let created;
  try {
    created = await createLink({
      slug,
      kind,
      label,
      clientId: optionalUuid(formData.get("client_id")),
      destination,
    });
  } catch (e) {
    return { error: slugErrorMessage(e) };
  }
  if (!created) return { error: "Não foi possível criar" };

  redirect(`/painel/plaquinhas/${created.id}`);
}

export async function updateLinkAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "Plaquinha inválida" };

  const kind = String(formData.get("kind") ?? "outro");
  if (!KIND_IDS.includes(kind)) return { error: "Tipo inválido" };

  const status = String(formData.get("status") ?? "");
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Status inválido" };

  let destination: string | null = null;
  const rawDest = String(formData.get("destination_url") ?? "").trim();
  if (rawDest !== "") {
    const d = validateDestination(rawDest);
    if (!d.ok) return { error: d.reason };
    destination = d.url;
  }
  if (status === "active" && !destination) {
    return { error: "Para ativar a plaquinha, informe o destino" };
  }

  const label = optionalText(formData.get("label"));
  if (label && label.length > 120) return { error: "Rótulo muito longo (máx. 120)" };

  try {
    await updateLink({
      id: id.data,
      destination,
      status,
      kind,
      label,
      clientId: optionalUuid(formData.get("client_id")),
    });
  } catch {
    return { error: "Não foi possível salvar a plaquinha" };
  }

  revalidatePath(`/painel/plaquinhas/${id.data}`);
  return { ok: "Plaquinha salva" };
}

export async function changeSlugAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "Plaquinha inválida" };

  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const v = validateSlug(slug);
  if (!v.ok) return { error: v.reason };

  try {
    await changeSlug(id.data, slug);
  } catch (e) {
    return { error: slugErrorMessage(e) };
  }

  revalidatePath(`/painel/plaquinhas/${id.data}`);
  return { ok: "Link alterado" };
}

/** Ação explícita do botão "Marcar como impressa" (vale mesmo com URL provisória). */
export async function markPrintedAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "Plaquinha inválida" };

  try {
    await markPrintedOne(id.data);
  } catch {
    return { error: "Não foi possível marcar como impressa" };
  }

  revalidatePath(`/painel/plaquinhas/${id.data}`);
  return { ok: "Marcada como impressa" };
}

/** Chamada ao baixar QR/ZIP: NÃO faz nada se a URL base for provisória. */
export async function markPrinted(ids: string[]): Promise<{ marked: number }> {
  await requireUser();
  if (isProvisionalBaseUrl()) return { marked: 0 };
  const valid = (Array.isArray(ids) ? ids : []).filter((i) => uuid.safeParse(i).success);
  if (valid.length === 0) return { marked: 0 };

  try {
    return { marked: await markPrintedMany(valid) };
  } catch {
    return { marked: 0 };
  }
}

/** Indicador "disponível/indisponível" do formulário de nova plaquinha. */
export async function checkSlugAction(slug: string): Promise<"available" | "taken" | "invalid"> {
  await requireUser();
  const normalized = normalizeSlug(String(slug ?? ""));
  if (!validateSlug(normalized).ok) return "invalid";
  return (await isSlugTaken(normalized)) ? "taken" : "available";
}
