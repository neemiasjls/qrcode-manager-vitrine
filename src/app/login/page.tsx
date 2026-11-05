import { ChartNoAxesColumn, Repeat2, FolderTree } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

const POINTS = [
  { Icon: Repeat2, text: "Troque o destino de uma plaquinha sem reimprimir o QR." },
  { Icon: ChartNoAxesColumn, text: "Veja quantas vezes cada plaquinha foi lida." },
  { Icon: FolderTree, text: "Organize por cliente e gere lotes prontos para gráfica." },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Painel da marca (desktop) */}
      <section
        aria-label="Placa Viva"
        className="relative hidden overflow-hidden bg-brand-panel p-12 text-brand-panel-foreground lg:flex lg:flex-col lg:justify-between"
      >
        <PlateGrid />
        <div className="relative flex items-center gap-3">
          <LogoMark inverse className="size-10" />
          <span className="pt-1 text-xl font-extrabold tracking-[-0.025em]">Placa Viva</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.03em] xl:text-5xl">
            A placa fica. O destino muda quando você quiser.
          </h1>
          <ul className="space-y-4">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[0.9375rem] leading-snug text-brand-panel-muted">
                <Icon className="mt-0.5 size-4.5 shrink-0 text-signal" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-panel-muted">Painel interno de QR codes dinâmicos.</p>
      </section>

      {/* Formulário */}
      <section className="relative flex flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em]">Entrar no painel</h2>
              <p className="text-sm text-muted-foreground">Acesso restrito à equipe. Use seu usuário e senha.</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

/** Grade de módulos de QR em baixo contraste: textura tirada do próprio objeto do produto. */
function PlateGrid() {
  // padrão fixo (determinístico) de módulos, só decorativo
  const cells: [number, number][] = [];
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 14; x++) {
      if (((x * 7 + y * 13 + x * y) % 5 === 0 || (x + y) % 7 === 0) && !(x < 5 && y < 5)) cells.push([x, y]);
    }
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 140 140"
      className="pointer-events-none absolute -right-24 -bottom-24 size-[34rem] text-brand-panel-foreground opacity-[0.07]"
    >
      <rect x="2" y="2" width="44" height="44" rx="8" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="16" y="16" width="16" height="16" rx="3" fill="currentColor" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * 10 + 1} y={y * 10 + 1} width="8" height="8" rx="2" fill="currentColor" />
      ))}
    </svg>
  );
}
