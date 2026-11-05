import { randomUUID } from "node:crypto";
import { Info } from "lucide-react";
import { KINDS } from "@/lib/kinds";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActionForm, Field } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { createBatchAction } from "../actions";

export const metadata = { title: "Novo lote" };

export default function NovoLotePage() {
  // Um request_id novo por carregamento da página: reenviar o formulário (clique duplo) não duplica o lote.
  const requestId = randomUUID();

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader back={{ href: "/painel/lotes", label: "Lotes" }} title="Novo lote" />
      <Card>
        <CardContent>
          <ActionForm action={createBatchAction} submitLabel="Criar lote" pendingLabel="Criando...">
            <input type="hidden" name="request_id" value={requestId} />
            <Field label="Nome do lote" htmlFor="name" hint="Ex.: Lote outubro - cardápios">
              <Input id="name" name="name" required maxLength={120} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Quantidade (1 a 500)" htmlFor="quantity">
                <Input id="quantity" name="quantity" type="number" min={1} max={500} defaultValue={10} required />
              </Field>
              <Field label="Tipo" htmlFor="kind">
                <NativeSelect id="kind" name="kind" defaultValue="outro">
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              As plaquinhas nascem &quot;não vinculadas&quot; e mostram uma página padrão até serem vinculadas a um
              cliente.
            </p>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
