"use client";

import { useState } from "react";
import { ActionForm, Field } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/native-select";
import { KINDS } from "@/lib/kinds";
import { updateLinkAction } from "../actions";

type Props = {
  link: {
    id: string;
    destination_url: string | null;
    status: string;
    kind: string;
    label: string | null;
    client_id: string | null;
  };
  clients: { id: string; name: string }[];
};

export function EditLinkForm({ link, clients }: Props) {
  const [destination, setDestination] = useState(link.destination_url ?? "");
  const [status, setStatus] = useState(link.status);
  const hasDestination = destination.trim() !== "";

  // `active` exige destino: a opção fica desabilitada enquanto o campo estiver vazio.
  const effectiveStatus = !hasDestination && status === "active" ? "unassigned" : status;

  return (
    <ActionForm action={updateLinkAction} submitLabel="Salvar">
      <input type="hidden" name="id" value={link.id} />
      <Field label="Destino" htmlFor="destination_url" hint="Pode ser trocado a qualquer momento: o QR continua o mesmo.">
        <Input
          id="destination_url"
          name="destination_url"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="https://..."
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" htmlFor="status">
          <NativeSelect
            id="status"
            name="status"
            value={effectiveStatus}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active" disabled={!hasDestination}>
              Ativa
            </option>
            <option value="unassigned">Não vinculada</option>
            <option value="paused">Pausada</option>
            <option value="archived">Arquivada</option>
          </NativeSelect>
        </Field>
        <Field label="Tipo" htmlFor="kind">
          <NativeSelect id="kind" name="kind" defaultValue={link.kind}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cliente" htmlFor="client_id">
          <NativeSelect id="client_id" name="client_id" defaultValue={link.client_id ?? ""}>
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Rótulo" htmlFor="label">
          <Input id="label" name="label" defaultValue={link.label ?? ""} maxLength={120} />
        </Field>
      </div>
    </ActionForm>
  );
}
