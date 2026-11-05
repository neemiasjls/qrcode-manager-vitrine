import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { getClient } from "@/lib/data/clients";
import { hostOf } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";
import { ClientFields } from "@/components/client-fields";
import { KindTile } from "@/components/kind-icon";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { deleteClientAction, updateClientAction } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const found = await getClient(id);
  if (!found) notFound();
  const { client, links } = found;
  const list = links ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/painel/clientes", label: "Clientes" }}
        title={client.name}
        description={`${list.length} ${list.length === 1 ? "plaquinha vinculada" : "plaquinhas vinculadas"}`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ActionForm action={updateClientAction} submitLabel="Salvar">
              <input type="hidden" name="id" value={client.id} />
              <ClientFields values={client} />
            </ActionForm>
            <div className="rounded-lg border border-danger-border/70 p-4">
              <ActionForm
                action={deleteClientAction}
                submitLabel="Excluir cliente"
                pendingLabel="Excluindo..."
                variant="destructive"
                className="space-y-3"
              >
                <input type="hidden" name="id" value={client.id} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Excluir cliente</p>
                  <p className="text-xs text-muted-foreground">
                    Só é possível excluir clientes sem plaquinhas vinculadas.
                  </p>
                </div>
              </ActionForm>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plaquinhas</CardTitle>
            <CardDescription>{list.length === 0 ? "Nenhuma ainda." : `${list.length} no total.`}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {list.length === 0 ? (
              <EmptyState icon={QrCode} title="Nenhuma plaquinha vinculada" className="py-6">
                Use Vincular para ligar uma plaquinha de lote a este cliente.
              </EmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Link</TableHead>
                    <TableHead className="hidden sm:table-cell">Destino</TableHead>
                    <TableHead className="pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((l) => (
                    <TableRow key={l.id!} className="group relative">
                      <TableCell className="max-w-52 pl-5">
                        <span className="flex items-center gap-2.5">
                          <KindTile kind={l.kind!} size="sm" />
                          <Link
                            href={`/painel/plaquinhas/${l.id}`}
                            className="truncate rounded-sm font-mono font-semibold underline-offset-4 outline-none group-hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 after:absolute after:inset-0"
                          >
                            {l.slug}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell className="hidden max-w-40 truncate text-muted-foreground sm:table-cell">
                        {hostOf(l.destination_url)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <StatusBadge status={l.status!} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
