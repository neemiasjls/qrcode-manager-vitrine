// Tema claro/escuro/sistema sem flash: o script inline (THEME_SCRIPT) roda no <head> antes da
// primeira pintura; o restante (store, setTheme) roda no cliente.

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/**
 * Lê a preferência salva e aplica `class="dark"`, `data-theme-pref` e `color-scheme` no <html>.
 * Mantido em ES5 e sem dependências: é serializado como string.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.setAttribute("data-theme-pref",p);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

const listeners = new Set<() => void>();

function media(): MediaQueryList | null {
  return typeof window === "undefined" ? null : window.matchMedia("(prefers-color-scheme: dark)");
}

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") return media()?.matches ? "dark" : "light";
  return pref;
}

export function applyTheme(pref: ThemePref, { animate = false } = {}) {
  const el = document.documentElement;
  const resolved = resolveTheme(pref);
  // Sem transições durante a troca: evita cores "escorrendo" em botões com transition.
  let style: HTMLStyleElement | null = null;
  if (!animate) {
    style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
  }
  el.classList.toggle("dark", resolved === "dark");
  el.setAttribute("data-theme-pref", pref);
  el.style.colorScheme = resolved;
  if (style) {
    // força o recálculo de estilo antes de reativar as transições
    void window.getComputedStyle(document.body).opacity;
    const s = style;
    requestAnimationFrame(() => s.remove());
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* sem storage (modo privado): vale só para esta aba */
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const mql = media();
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) {
      applyTheme(readThemePref());
      listener();
    }
  };
  const onMedia = () => {
    if (readThemePref() === "system") applyTheme("system");
    listener();
  };
  window.addEventListener("storage", onStorage);
  mql?.addEventListener("change", onMedia);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    mql?.removeEventListener("change", onMedia);
  };
}

/** Tema efetivo atual, lido do DOM (fonte da verdade depois do script inline). */
export function readResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
