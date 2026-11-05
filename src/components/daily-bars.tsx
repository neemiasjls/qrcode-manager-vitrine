const nf = new Intl.NumberFormat("pt-BR");

export function DailyBars({ data }: { data: { day: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const sum = data.reduce((acc, d) => acc + d.total, 0);
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  const summary =
    data.length > 0
      ? `Acessos por dia de ${fmt(data[0].day)} a ${fmt(data[data.length - 1].day)}: ${sum} no total, máximo de ${max} em um dia.`
      : "Sem dados de acessos por dia.";

  return (
    <figure className="space-y-2">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <figcaption className="font-semibold text-foreground">Acessos por dia</figcaption>
        <span className="tabular-nums">máx. {nf.format(max)}</span>
      </div>
      <div
        className="relative flex h-32 items-end gap-[3px] border-b border-border bg-[linear-gradient(to_top,var(--border)_1px,transparent_1px)] bg-size-[100%_50%] pt-px"
        role="img"
        aria-label={summary}
      >
        {data.map((d) => (
          <div key={d.day} title={`${fmt(d.day)}: ${d.total}`} className="group flex h-full flex-1 items-end">
            <div
              className={
                d.total === 0
                  ? "h-0.5 w-full rounded-full bg-muted-foreground/25"
                  : "w-full rounded-t-[3px] bg-chart-1 transition-colors group-hover:bg-primary"
              }
              style={d.total === 0 ? undefined : { height: `${Math.max(4, (d.total / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      {data.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{fmt(data[0].day)}</span>
          <span>{fmt(data[data.length - 1].day)}</span>
        </div>
      )}
    </figure>
  );
}
