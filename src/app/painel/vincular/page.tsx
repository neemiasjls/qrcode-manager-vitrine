import Link from "next/link";
import { CircleAlert, CircleCheck, Search } from "lucide-react";
import { findBySlugForAssign } from "@/lib/data/links";
import { listClientOptions } from "@/lib/data/clients";
import { extractSlug } from "@/lib/format";
import { KINDS } from "@/lib/kinds";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionForm, Field } from "@/components/action-form";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { assignLinkAction } from "./actions";

export const metadata = { title: "Vincular" };

export default async function VincularPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const slug = extractSlug(q);
  const searched = slug !== "";
  const link = slug ? await findBySlugForAssign(slug) : null;
  const clients = link?.status === "unassigned" ? await listClientOptions() : [];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Vincular plaquinha"
        description="Ligue uma plaquinha de lote a um cliente e defina para onde ela leva."
      />

      <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cole o link completo ou só o código (slug) da plaquinha"
            aria-label="Link ou slug da plaquinha"
            className="h-10 pl-9"
            autoComplete="off"
            autoFocus={!searched}
          />
        </div>
        <Button type="submit" size="lg">
          Buscar
        </Button>
      </form>

      {searched && !link && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>Nenhuma plaquinha encontrada com o código &quot;{slug}&quot;.</AlertDescription>
        </Alert>
      )}

      {link && link.status !== "unassigned" && (
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  A plaquinha <span className="font-mono font-semibold">{link.slug}</span>
                </span>
                <StatusBadge status={link.status} />
                <span>
                  já está vinculada
                  {link.client_name ? (
                    <>
                      {" "}
                      ao cliente <strong className="font-semibold">{link.client_name}</strong>
                    </>
                  ) : (
                    ""
                  )}
                  .
                </span>
              </p>
            </div>
            <Link href={`/painel/plaquinhas/${link.id}`} className={buttonVariants({ variant: "outline" })}>
              Abrir plaquinha
            </Link>
          </CardContent>
        </Card>
      )}

      {link && link.status === "unassigned" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Vincular <span className="font-mono">{link.slug}</span>
              <StatusBadge status={link.status} />
            </CardTitle>
            <CardDescription>Escolha um cliente existente ou digite o nome de um novo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={assignLinkAction} submitLabel="Vincular e ativar" pendingLabel="Vinculando...">
              <input type="hidden" name="id" value={link.id} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Cliente existente" htmlFor="client_id">
                  <NativeSelect id="client_id" name="client_id" defaultValue="">
                    <option value="">— escolher —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field
                  label="…ou novo cliente: nome"
                  htmlFor="new_client_name"
                  hint="Usado só se nenhum cliente existente for escolhido."
                >
                  <Input id="new_client_name" name="new_client_name" maxLength={120} />
                </Field>
              </div>
              <Field label="Destino" htmlFor="destination_url">
                <Input id="destination_url" name="destination_url" placeholder="https://..." required />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Tipo" htmlFor="kind">
                  <NativeSelect id="kind" name="kind" defaultValue={link.kind}>
                    {KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Rótulo" htmlFor="label">
                  <Input id="label" name="label" defaultValue={link.label ?? ""} maxLength={120} />
                </Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
