import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatch } from "@/lib/data/batches";
import { publicLinkFor } from "@/lib/links";
import { formatDateTime, hostOf } from "@/lib/format";
import { kindLabel } from "@/lib/kinds";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { BatchDownload } from "@/components/batch-download";
import { KindTile } from "@/components/kind-icon";
import { PageHeader } from "@/components/page-header";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LoteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const found = await getBatch(id);
  if (!found) notFound();
  const { batch, links } = found;

  const items = links.map((l) => ({ id: l.id, slug: l.slug, link: publicLinkFor(l.slug) }));
  const linked = links.filter((l) => l.status !== "unassigned").length;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/painel/lotes", label: "Lotes" }}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <KindTile kind={batch.kind} size="lg" />
            <span className="min-w-0 break-words">{batch.name}</span>
          </span>
        }
        description={`${kindLabel(batch.kind)}, ${batch.quantity} plaquinhas, ${linked} vinculadas. Criado em ${formatDateTime(batch.created_at)}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Arquivos para impressão</CardTitle>
          <CardDescription>Gera os QR codes de todas as plaquinhas deste lote.</CardDescription>
        </CardHeader>
        <CardContent>
          <BatchDownload batchName={batch.name} items={items} />
        </CardContent>
      </Card>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Link</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Cliente</TableHead>
              <TableHead className="hidden pr-4 md:table-cell">Destino</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(links ?? []).map((l) => (
              <TableRow key={l.id!} className="group relative">
                <TableCell className="pl-4">
                  <Link
                    href={`/painel/plaquinhas/${l.id}`}
                    className="rounded-sm font-mono font-semibold underline-offset-4 outline-none group-hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 after:absolute after:inset-0"
                  >
                    {l.slug}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={l.status!} />
                </TableCell>
                <TableCell className="hidden max-w-48 truncate sm:table-cell">
                  {l.client_name ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="hidden max-w-48 truncate pr-4 text-muted-foreground md:table-cell">
                  {hostOf(l.destination_url)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
