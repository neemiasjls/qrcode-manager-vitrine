import Link from "next/link";
import { ChartNoAxesColumn, CircleCheck, CircleDashed, Plus, ScanLine } from "lucide-react";
import { getDashboard } from "@/lib/data/dashboard";
import { hostOf } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { KindTile } from "@/components/kind-icon";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("pt-BR");

export default async function DashboardPage() {
  const { active, unassigned, scans_30d, top } = await getDashboard();
  const max = Math.max(1, ...top.map((l) => l.scans_30d));

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Resumo das plaquinhas e dos acessos dos últimos 30 dias." />

      <Card className="py-0">
        <div className="grid grid-cols-3 divide-x divide-border">
          <Metric
            href="/painel/plaquinhas?status=active"
            label="Plaquinhas ativas"
            value={active}
            icon={CircleCheck}
            tone="text-success"
          />
          <Metric
            href="/painel/plaquinhas?status=unassigned"
            label="Não vinculadas"
            value={unassigned}
            icon={CircleDashed}
            tone="text-info"
          />
          <Metric label="Acessos em 30 dias" value={scans_30d} icon={ScanLine} tone="text-primary" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mais acessadas</CardTitle>
          <CardDescription>As 10 plaquinhas com mais leituras nos últimos 30 dias (bots não contam).</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {top.length === 0 ? (
            <EmptyState
              icon={ChartNoAxesColumn}
              title="Ainda não há acessos registrados"
              action={
                <Link href="/painel/plaquinhas/nova" className={buttonVariants({ variant: "outline" })}>
                  <Plus aria-hidden /> Nova plaquinha
                </Link>
              }
            >
              Quando alguém ler uma plaquinha ativa, ela aparece aqui.
            </EmptyState>
          ) : (
            <ol className="divide-y divide-border border-t border-border">
              {top.map((l, i) => (
                <li key={l.id}>
                  <Link
                    href={`/painel/plaquinhas/${l.id}`}
                    className="group grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:grid-cols-[1.5rem_auto_minmax(0,14rem)_minmax(0,1fr)_3.5rem]"
                  >
                    <span className="text-right text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                    <KindTile kind={l.kind} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm font-medium group-hover:underline group-hover:underline-offset-4">
                        {l.slug}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[l.label, l.client_name].filter(Boolean).join(" · ") || hostOf(l.destination_url)}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="col-span-3 col-start-2 row-start-2 h-1.5 overflow-hidden rounded-full bg-muted sm:col-span-1 sm:col-start-auto sm:row-start-auto"
                    >
                      <span
                        className="block h-full rounded-full bg-chart-1"
                        style={{ width: `${Math.max(3, (l.scans_30d / max) * 100)}%` }}
                      />
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums">
                      {nf.format(l.scans_30d)}
                      <span className="sr-only"> acessos</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="flex flex-col gap-1.5 text-xs leading-tight font-medium text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
        <Icon className={cn("size-4", tone)} aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-2xl leading-none sm:text-[2rem] font-bold tracking-[-0.02em] tabular-nums">{nf.format(value)}</p>
    </>
  );
  const cls = "block px-3 py-4 sm:px-5 sm:py-5";
  return href ? (
    <div className="min-w-0">
      <Link
        href={href}
        className={cn(
          cls,
          "h-full outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
        )}
      >
        {body}
      </Link>
    </div>
  ) : (
    <div className={cls}>{body}</div>
  );
}
