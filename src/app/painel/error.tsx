"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PainelError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl border border-danger-border bg-danger-soft text-danger-strong">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <h1 className="text-xl font-bold tracking-[-0.01em]">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        O servidor ou o banco de dados não respondeu. Confira se o Postgres está rodando e tente de novo.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Código: {error.digest}</p>}
      <Button className="mt-6" onClick={() => retry()}>
        <RotateCw aria-hidden /> Tentar de novo
      </Button>
    </div>
  );
}
