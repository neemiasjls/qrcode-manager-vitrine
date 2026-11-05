import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string; dot: string }> = {
  active: {
    label: "Ativa",
    className: "border-success-border bg-success-soft text-success-strong",
    dot: "bg-success",
  },
  unassigned: {
    label: "Não vinculada",
    className: "border-info-border bg-info-soft text-info-strong",
    dot: "bg-info",
  },
  paused: {
    label: "Pausada",
    className: "border-warning-border bg-warning-soft text-warning-strong",
    dot: "bg-warning",
  },
  archived: {
    label: "Arquivada",
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = MAP[status] ?? { label: status, className: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" };
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap",
        m.className,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}
