"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { ActionForm, Field } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/native-select";
import { KINDS } from "@/lib/kinds";
import { normalizeSlug, validateSlug } from "@/lib/slug";
import { publicLinkFor } from "@/lib/links";
import { checkSlugAction, createLinkAction } from "../actions";

type Availability = { slug: string; state: "available" | "taken" | "invalid"; reason?: string };

export function NewLinkForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [rawSlug, setRawSlug] = useState("");
  const [avail, setAvail] = useState<Availability | null>(null);

  const normalized = normalizeSlug(rawSlug);
  const showSlug = rawSlug.trim() !== "";

  useEffect(() => {
    if (!normalized) return;
    const v = validateSlug(normalized);
    if (!v.ok) {
      const t = setTimeout(() => setAvail({ slug: normalized, state: "invalid", reason: v.reason }), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const state = await checkSlugAction(normalized);
        if (!cancelled) setAvail({ slug: normalized, state });
      } catch {
        /* sem resposta (ex.: sessão expirada): o servidor valida ao criar */
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [normalized]);

  const current = showSlug && avail && avail.slug === normalized ? avail : null;

  return (
    <ActionForm action={createLinkAction} submitLabel="Criar plaquinha" pendingLabel="Criando...">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="kind">
          <NativeSelect id="kind" name="kind" defaultValue="outro">
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Rótulo" htmlFor="label" hint="Ex.: Pizzaria do Zé - balcão">
          <Input id="label" name="label" maxLength={120} />
        </Field>
      </div>

      <Field label="Cliente (opcional)" htmlFor="client_id">
        <NativeSelect id="client_id" name="client_id" defaultValue="">
          <option value="">Sem cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Destino (opcional)"
        htmlFor="destination_url"
        hint="Sem destino, a plaquinha nasce como não vinculada."
      >
        <Input id="destination_url" name="destination_url" placeholder="https://www.google.com" />
      </Field>

      <Field
        label="Link personalizado (opcional)"
        htmlFor="slug"
        hint="Deixe vazio para gerar um link aleatório."
      >
        <Input
          id="slug"
          name="slug"
          value={rawSlug}
          onChange={(e) => setRawSlug(e.target.value)}
          placeholder="pizzaria-do-ze"
          autoComplete="off"
        />
        {showSlug && (
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
            aria-live="polite"
          >
            {normalized ? (
              <>
                <span className="min-w-0 font-mono break-all text-muted-foreground">{publicLinkFor(normalized)}</span>
                {!current && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> verificando
                  </span>
                )}
                {current?.state === "available" && (
                  <span className="inline-flex items-center gap-1 font-semibold text-success-strong">
                    <CircleCheck className="size-3.5" aria-hidden /> disponível
                  </span>
                )}
                {current?.state === "taken" && (
                  <span className="inline-flex items-center gap-1 font-semibold text-danger-strong">
                    <CircleX className="size-3.5" aria-hidden /> indisponível
                  </span>
                )}
                {current?.state === "invalid" && (
                  <span className="inline-flex items-center gap-1 font-semibold text-danger-strong">
                    <CircleX className="size-3.5" aria-hidden /> {current.reason}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-danger-strong">
                <CircleX className="size-3.5" aria-hidden /> Link inválido
              </span>
            )}
          </div>
        )}
      </Field>
    </ActionForm>
  );
}
