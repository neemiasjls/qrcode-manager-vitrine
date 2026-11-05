import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";

// Limpa o cookie de sessão e volta ao login (usado quando o cookie é válido mas rejeitado pela DAL).
export async function GET(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
