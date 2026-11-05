import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { listBatches } from "@/lib/data/batches";
import { formatDateTime } from "@/lib/format";
import { kindLabel } from "@/lib/kinds";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KindTile } from "@/components/kind-icon";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Lotes" };

export default async function LotesPage() {
  const rows = await listBatches();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lotes"
        description="Plaquinhas geradas em série para imprimir de uma vez e vincular depois."
        actions={
          <Link href="/painel/lotes/novo" className={buttonVariants()}>
            <Plus aria-hidden /> Novo lote
          </Link>
        }
      />
      <Card className="py-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Nenhum lote criado"
            action={
              <Link href="/painel/lotes/novo" className={buttonVariants()}>
                <Plus aria-hidden /> Criar lote
              </Link>
            }
          >
            Um lote gera várias plaquinhas &quot;não vinculadas&quot; e um ZIP com os QR codes para a gráfica.
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Nome</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead>Vinculadas</TableHead>
                <TableHead className="hidden pr-4 text-right sm:table-cell">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const pct = b.quantity > 0 ? Math.round((b.linked / b.quantity) * 100) : 0;
                return (
                  <TableRow key={b.id} className="group relative">
                    <TableCell className="max-w-64 pl-4">
                      <span className="flex items-center gap-2.5">
                        <KindTile kind={b.kind} size="sm" />
                        <Link
                          href={`/painel/lotes/${b.id}`}
                          className="truncate rounded-sm font-semibold underline-offset-4 outline-none group-hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 after:absolute after:inset-0"
                        >
                          {b.name}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{kindLabel(b.kind)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block"
                        >
                          <span className="block h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="tabular-nums">
                          <strong className="font-semibold">{b.linked}</strong>
                          <span className="text-muted-foreground"> / {b.quantity}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden pr-4 text-right text-muted-foreground tabular-nums sm:table-cell">
                      {formatDateTime(b.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
