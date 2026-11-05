"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  applyTheme,
  readResolvedTheme,
  readThemePref,
  setThemePref,
  subscribeTheme,
  type ResolvedTheme,
  type ThemePref,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Mantém o <html> em dia com a preferência: reaplica depois do remount do StrictMode (que limpa os
 * atributos que o script inline colocou), acompanha o tema do sistema e outras abas.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readThemePref());
    return subscribeTheme(() => {});
  }, []);
  return null;
}

/** Preferência salva; `null` durante o SSR e a hidratação. */
export function useThemePref(): ThemePref | null {
  return useSyncExternalStore(subscribeTheme, readThemePref, () => null);
}

export function useResolvedTheme(): ResolvedTheme | null {
  return useSyncExternalStore(subscribeTheme, readResolvedTheme, () => null);
}

const OPTIONS = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
] as const;

/**
 * Alternador claro/escuro/sistema. O destaque visual vem do CSS (`html[data-theme-pref]`), então
 * aparece certo já na primeira pintura; o estado do React só cuida do `aria-checked`.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const pref = useThemePref();

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === null ? undefined : pref === value}
          aria-label={label}
          title={label}
          data-value={value}
          onClick={() => setThemePref(value)}
          className="theme-opt inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
