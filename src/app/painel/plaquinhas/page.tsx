import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, QrCode, Search, X } from "lucide-react";
import { listLinks, PAGE_SIZE } from "@/lib/data/links";
import { hostOf, sanitizeSearch } from "@/lib/format";
import { KINDS, KIND_IDS, kindLabel } from "@/lib/kinds";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KindTile } from "@/components/kind-icon";
import { StatusBadge } from "@/components/status-badge";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { id: "active", label: "Ativa" },
  { id: "unassigned", label: "Não vinculada" },
  { id: "paused", label: "Pausada" },
  { id: "archived", label: "Arquivada" },
];

const nf = new Intl.NumberFormat("pt-BR");

type SP = { q?: string; status?: string; kind?: string; page?: string };

export default async function PlaquinhasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const term = sanitizeSearch(q);
  const status = STATUS_OPTIONS.some((s) => s.id === sp.status) ? sp.status! : "";
  const kind = KIND_IDS.includes(sp.kind ?? "") ? sp.kind! : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { rows: links, total } = await listLinks({ term, status, kind, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || status || kind);
  const list = links ?? [];

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    if (kind) u.set("kind", kind);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/painel/plaquinhas${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plaquinhas"
        description={`${nf.format(total)} ${total === 1 ? "plaquinha" : "plaquinhas"}${filtered ? " com estes filtros" : ""}`}
        actions={
          <Link href="/painel/plaquinhas/nova" className={buttonVariants()}>
            <Plus aria-hidden /> Nova plaquinha
          </Link>
        }
      />

      <Card className="gap-0 py-0">
        <form
          method="get"
          role="search"
          className="grid gap-2 border-b border-border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_11rem_auto] sm:items-center"
        >
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por link, rótulo ou cliente"
              aria-label="Buscar"
              className="pl-9"
              type="search"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <NativeSelect name="status" defaultValue={status} aria-label="Status">
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="kind" defaultValue={kind} aria-label="Tipo">
              <option value="">Todos os tipos</option>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" className="flex-1 sm:flex-none">
              Filtrar
            </Button>
            {filtered && (
              <Link
                href="/painel/plaquinhas"
                className={buttonVariants({ variant: "ghost", className: "text-muted-foreground" })}
              >
                <X aria-hidden /> Limpar
              </Link>
            )}
          </div>
        </form>

        {list.length === 0 ? (
          <EmptyState
            icon={QrCode}
            title={filtered ? "Nenhuma plaquinha com estes filtros" : "Nenhuma plaquinha ainda"}
            action={
              filtered ? (
                <Link href="/painel/plaquinhas" className={buttonVariants({ variant: "outline" })}>
                  Limpar filtros
                </Link>
              ) : (
                <Link href="/painel/plaquinhas/nova" className={buttonVariants()}>
                  <Plus aria-hidden /> Criar a primeira
                </Link>
              )
            }
          >
            {filtered
              ? "Tente outro termo de busca ou remova algum filtro."
              : "Crie uma plaquinha avulsa ou gere um lote para imprimir várias de uma vez."}
          </EmptyState>
        ) : (
          <>
            {/* Celular: lista */}
            <ul className="divide-y divide-border md:hidden">
              {list.map((l) => (
                <li key={l.id!}>
                  <Link
                    href={`/painel/plaquinhas/${l.id}`}
                    className="flex items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  >
                    <KindTile kind={l.kind!} className="mt-0.5" />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-sm font-semibold">{l.slug}</span>
                        <StatusBadge status={l.status!} />
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[l.label, l.client_name].filter(Boolean).join(" · ") || kindLabel(l.kind!)}
                      </span>
                      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{hostOf(l.destination_url)}</span>
                        <span className="shrink-0 tabular-nums">{nf.format(l.scans_30d ?? 0)} acessos/30d</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tablet e desktop: tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-4">
                      <span className="sr-only">Tipo</span>
                    </TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden lg:table-cell">Destino</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Acessos (30d)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((l) => (
                    <TableRow key={l.id!} className="group relative">
                      <TableCell className="pl-4">
                        <KindTile kind={l.kind!} size="sm" />
                      </TableCell>
                      <TableCell className="max-w-64">
                        <Link
                          href={`/painel/plaquinhas/${l.id}`}
                          className="block truncate rounded-sm font-mono font-semibold underline-offset-4 outline-none group-hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 after:absolute after:inset-0"
                        >
                          {l.slug}
                        </Link>
                        {l.label && <span className="block truncate text-xs text-muted-foreground">{l.label}</span>}
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {l.client_name ?? <span className="text-muted-foreground">Sem cliente</span>}
                      </TableCell>
                      <TableCell className="hidden max-w-48 truncate text-muted-foreground lg:table-cell">
                        {hostOf(l.destination_url)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={l.status!} />
                      </TableCell>
                      <TableCell className="pr-4 text-right font-semibold tabular-nums">
                        {nf.format(l.scans_30d ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            <PageLink href={qs(page - 1)} disabled={page <= 1}>
              <ChevronLeft aria-hidden /> Anterior
            </PageLink>
            <PageLink href={qs(page + 1)} disabled={page >= pages}>
              Próxima <ChevronRight aria-hidden />
            </PageLink>
          </div>
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled) {
    return (
      <span aria-disabled className={cn(cls, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
