import { cn } from "@/lib/utils";

/**
 * Marca Placa Viva: uma placa com o "olho" de canto do QR e um ponto âmbar de sinal
 * (o destino muda, a placa continua a mesma).
 */
export function LogoMark({ className, inverse }: { className?: string; inverse?: boolean }) {
  // inverse: placa clara sobre o painel verde da tela de login
  const plate = inverse ? "var(--brand-panel-foreground)" : "var(--primary)";
  const ink = inverse ? "var(--brand-panel)" : "var(--primary-foreground)";
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill={plate} />
      <rect x="7" y="7" width="11" height="11" rx="2.5" fill="none" stroke={ink} strokeWidth="2.4" />
      <rect x="10.6" y="10.6" width="3.8" height="3.8" rx="0.9" fill={ink} />
      <rect x="7" y="21.5" width="3.5" height="3.5" rx="0.9" fill={ink} />
      <rect x="13.2" y="21.5" width="3.5" height="3.5" rx="0.9" fill={ink} opacity="0.7" />
      <rect x="21.5" y="7" width="3.5" height="3.5" rx="0.9" fill={ink} opacity="0.7" />
      <circle cx="23.25" cy="23.25" r="3.4" fill="var(--signal)" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="pt-0.5 text-[1.0625rem] leading-none font-extrabold tracking-[-0.025em]">Placa Viva</span>
    </span>
  );
}
