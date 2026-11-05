import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">O endereço não existe neste painel.</p>
      </div>
      <Link href="/painel" className={buttonVariants({ variant: "outline" })}>
        Ir para o painel
      </Link>
    </main>
  );
}
