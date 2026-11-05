import type { PageKind } from "./decide";

export type PublicPage = PageKind | "unavailable_error";

type Content = { title: string; text: string; icon: string; tone: "neutral" | "wait" | "pause" | "error"; retry?: boolean };

// Ícones em traço (mesmo estilo do painel), desenhados inline: a página não carrega nada externo.
const ICON = {
  search:
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8.5 8.5l5 5M13.5 8.5l-5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  retry: '<path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.5"/><path d="M20 4v4.5h-4.5"/>',
};

const CONTENT: Record<PublicPage, Content> = {
  not_found: {
    title: "Link não encontrado",
    text: "Este link não existe ou foi digitado errado.",
    icon: ICON.search,
    tone: "neutral",
  },
  unassigned: {
    title: "Plaquinha ainda não ativada",
    text: "Esta plaquinha ainda não foi configurada. Volte em breve.",
    icon: ICON.clock,
    tone: "wait",
  },
  unavailable: {
    title: "Link temporariamente indisponível",
    text: "Este link está temporariamente fora do ar. Tente novamente mais tarde.",
    icon: ICON.pause,
    tone: "pause",
  },
  unavailable_error: {
    title: "Tente novamente em instantes",
    text: "Não foi possível abrir o link agora. Tente novamente em instantes.",
    icon: ICON.retry,
    tone: "error",
    retry: true,
  },
};

export function renderPage(kind: PublicPage): string {
  const { title, text, icon, tone, retry } = CONTENT[kind];
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f4f5f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#151716" media="(prefers-color-scheme: dark)">
<title>${title}</title>
<style>
  :root{--bg:#f4f5f4;--card:#fff;--fg:#1b1f1d;--muted:#59605c;--line:#e2e5e3;
    --tone-bg:#eef0ef;--tone-fg:#3f4642;--btn:#1b1f1d;--btn-fg:#fff;color-scheme:light dark}
  .wait{--tone-bg:#e9f1fb;--tone-fg:#1f4f8a}
  .pause{--tone-bg:#fbf3e2;--tone-fg:#7a4d0b}
  .error{--tone-bg:#fcecea;--tone-fg:#9b2c22}
  @media (prefers-color-scheme:dark){
    :root{--bg:#151716;--card:#1d201f;--fg:#eceeed;--muted:#a7aeaa;--line:#2c302e;
      --tone-bg:#262a28;--tone-fg:#c9cfcc;--btn:#eceeed;--btn-fg:#151716}
    .wait{--tone-bg:#1c2a3b;--tone-fg:#a9c8ef}
    .pause{--tone-bg:#33291a;--tone-fg:#f0cd8a}
    .error{--tone-bg:#3a201d;--tone-fg:#f3b0a8}
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;min-height:100dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    -webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
  main{flex:1;display:flex;align-items:center;justify-content:center;
    padding:max(24px,env(safe-area-inset-top)) 20px max(32px,env(safe-area-inset-bottom))}
  .card{width:100%;max-width:24rem;background:var(--card);border:1px solid var(--line);border-radius:20px;
    padding:36px 28px 32px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px -16px rgba(0,0,0,.18)}
  .icon{width:64px;height:64px;margin:0 auto 22px;border-radius:18px;display:flex;align-items:center;
    justify-content:center;background:var(--tone-bg);color:var(--tone-fg)}
  .icon svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  h1{font-size:1.375rem;line-height:1.25;letter-spacing:-.01em;margin:0 0 10px;text-wrap:balance}
  p{margin:0;color:var(--muted);font-size:1rem;line-height:1.55;text-wrap:pretty}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:26px;min-height:48px;
    padding:0 24px;border-radius:12px;background:var(--btn);color:var(--btn-fg);font:inherit;font-weight:600;
    text-decoration:none;width:100%}
  .btn:focus-visible{outline:3px solid var(--tone-fg);outline-offset:3px}
  @media (min-width:480px){.card{padding:44px 40px 40px}.btn{width:auto}}
</style>
</head>
<body>
<main>
<div class="card ${tone}">
<div class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icon}</svg></div>
<h1>${title}</h1>
<p>${text}</p>
${retry ? '<a class="btn" href="">Tentar novamente</a>' : ""}
</div>
</main>
</body>
</html>`;
}
