import { notFound } from "next/navigation";
import { ArrowRight, History, Lock, Monitor, Printer, Smartphone } from "lucide-react";
import { getLinkDetail } from "@/lib/data/links";
import { publicLinkFor } from "@/lib/links";
import { formatDate, formatDateTime } from "@/lib/format";
import { kindLabel } from "@/lib/kinds";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionForm } from "@/components/action-form";
import { QrPanel } from "@/components/qr-panel";
import { DailyBars } from "@/components/daily-bars";
import { KindTile } from "@/components/kind-icon";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { EditLinkForm } from "./edit-link-form";
import { ChangeSlugDialog } from "./change-slug-dialog";
import { markPrintedAction } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nf = new Intl.NumberFormat("pt-BR");

export default async function PlaquinhaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const detail = await getLinkDetail(id);
  if (!detail) notFound();
  const { link, clients, aliases, history, days, mobile, desktop } = detail;
  const locked = !!link.printed_at || (link.scans_total ?? 0) > 0;
  const url = publicLinkFor(link.slug);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/painel/plaquinhas", label: "Plaquinhas" }}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <KindTile kind={link.kind!} size="lg" />
            <span className="min-w-0 font-mono text-xl font-semibold tracking-normal break-all sm:text-2xl">
              {link.slug}
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <StatusBadge status={link.status!} />
            <span>{kindLabel(link.kind!)}</span>
            {link.client_name && (
              <>
                <span aria-hidden className="text-border">
                  |
                </span>
                <span>{link.client_name}</span>
              </>
            )}
            {link.label && (
              <>
                <span aria-hidden className="text-border">
                  |
                </span>
                <span>{link.label}</span>
              </>
            )}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle>Destino e status</CardTitle>
            <CardDescription>Para onde o QR leva agora.</CardDescription>
          </CardHeader>
          <CardContent>
            <EditLinkForm
              link={{
                id: link.id,
                destination_url: link.destination_url,
                status: link.status!,
                kind: link.kind!,
                label: link.label,
                client_id: link.client_id,
              }}
              clients={clients}
            />
          </CardContent>
        </Card>

        <Card className="self-start lg:sticky lg:top-16 lg:col-start-2 lg:row-span-4 lg:row-start-1">
          <CardHeader>
            <CardTitle>QR code</CardTitle>
          </CardHeader>
          <CardContent>
            <QrPanel linkId={link.id} slug={link.slug} url={url} />
          </CardContent>
        </Card>

        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle>Link</CardTitle>
            <CardDescription>Endereço gravado no QR e no NFC.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <code className="min-w-0 rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-sm break-all">
                {url}
              </code>
              <ChangeSlugDialog linkId={link.id} currentSlug={link.slug} locked={locked} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Apelidos</h3>
              <p className="text-xs text-muted-foreground">Links antigos desta plaquinha que continuam funcionando.</p>
              {aliases.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {aliases.map((a) => (
                    <li
                      key={a.slug}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-sm"
                    >
                      <span className="font-mono">{a.slug}</span>
                      <span className="text-xs text-muted-foreground">desde {formatDate(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-border pt-5">
              {link.printed_at ? (
                <p className="flex items-center gap-2 text-sm">
                  <Lock className="size-4 text-muted-foreground" aria-hidden />
                  Impressa em {formatDateTime(link.printed_at)}
                </p>
              ) : (
                <ActionForm
                  action={markPrintedAction}
                  submitLabel="Marcar como impressa"
                  pendingLabel="Marcando..."
                  variant="outline"
                  className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center"
                >
                  <input type="hidden" name="id" value={link.id} />
                  <span className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Printer className="mt-px size-3.5 shrink-0" aria-hidden />
                    Trava o slug: depois disso, trocar o link mantém o antigo como apelido.
                  </span>
                </ActionForm>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
            <CardDescription>Bots não são contados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
              <Stat label="Total" value={link.scans_total ?? 0} />
              <Stat label="7 dias" value={link.scans_7d ?? 0} />
              <Stat label="30 dias" value={link.scans_30d ?? 0} />
            </div>
            <DailyBars data={days} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-4" aria-hidden /> Celular:{" "}
                <strong className="font-semibold text-foreground tabular-nums">{nf.format(mobile)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="size-4" aria-hidden /> Computador:{" "}
                <strong className="font-semibold text-foreground tabular-nums">{nf.format(desktop)}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle>Histórico de destinos</CardTitle>
          </CardHeader>
          <CardContent className={history.length === 0 ? "" : "px-0"}>
            {history.length === 0 ? (
              <EmptyState icon={History} title="Nenhuma troca de destino ainda" className="py-6" />
            ) : (
              <ol className="divide-y divide-border border-t border-border">
                {history.map((h) => (
                  <li key={h.id} className="space-y-1.5 px-5 py-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground tabular-nums">
                      {formatDateTime(h.changed_at)}
                    </p>
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 truncate text-muted-foreground line-through decoration-muted-foreground/50" title={h.old_url ?? ""}>
                        {h.old_url ?? "sem destino"}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="para" />
                      <span className="min-w-0 truncate font-medium" title={h.new_url ?? ""}>
                        {h.new_url ?? "sem destino"}
                      </span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-2xl leading-none font-bold tabular-nums">{nf.format(value)}</div>
      <div className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
