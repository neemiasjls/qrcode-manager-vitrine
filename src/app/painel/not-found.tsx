import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function PainelNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
        <SearchX className="size-5" aria-hidden />
      </span>
      <h1 className="text-xl font-bold tracking-[-0.01em]">Não encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Este item não existe ou foi removido. Confira o endereço ou volte para a lista.
      </p>
      <Link href="/painel" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
        Ir para o dashboard
      </Link>
    </div>
  );
}
