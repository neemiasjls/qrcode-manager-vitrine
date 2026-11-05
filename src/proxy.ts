// Next 16+: o antigo "middleware" agora se chama "proxy". Só checagem OTIMISTA (assinatura do
// cookie, sem banco). A verificação real fica na DAL (requireUser).
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { sessionSecret } from "@/lib/env-server";

export async function proxy(request: NextRequest) {
  // Server actions (POST com o header Next-Action) passam direto: quem recusa é o requireUser(),
  // que redireciona para /login. Redirecionar o POST aqui faria o cliente receber uma resposta
  // inesperada (erro em tela) em vez de ir ao login.
  if (request.headers.has("next-action")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token, sessionSecret()) : null;
  const path = request.nextUrl.pathname;
  const go = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };
  if (!session && path.startsWith("/painel")) return go("/login");
  if (session && path === "/login") return go("/painel");
  return NextResponse.next();
}

export const config = {
  // /r/* é público e não passa pelo proxy; assets e favicon também não.
  matcher: ["/((?!r/|_next/static|_next/image|favicon.ico).*)"],
};
