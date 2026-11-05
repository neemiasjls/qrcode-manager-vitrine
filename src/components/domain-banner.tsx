import { TriangleAlert } from "lucide-react";
import { isProvisionalBaseUrl, publicBaseUrl } from "@/lib/env";

export function DomainBanner() {
  if (!isProvisionalBaseUrl()) return null;
  return (
    <div role="alert" className="border-b border-danger-border bg-danger-soft text-danger-strong">
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 py-2 text-[0.8125rem] sm:px-6 sm:text-sm lg:px-8">
        <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
        <p className="min-w-0 leading-snug">
          <strong className="font-bold">URL base provisória</strong>{" "}
          <span className="font-mono break-all">({publicBaseUrl()})</span>. NÃO imprima nem grave plaquinhas até
          configurar o domínio definitivo.
        </p>
      </div>
    </div>
  );
}
