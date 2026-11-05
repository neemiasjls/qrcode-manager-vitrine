import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** <select> nativo (bom no celular) com o visual dos outros campos. `className` vai no contêiner. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        className="h-9 w-full appearance-none rounded-lg border border-input bg-card pr-8 pl-3 text-base shadow-[inset_0_1px_1px_oklch(0_0_0/0.03)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-muted/40 [&>option]:bg-popover [&>option]:text-popover-foreground"
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
