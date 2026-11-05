import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSessionToken } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sessionSecret } from "@/lib/env-server";

export type CurrentUser = { id: string; username: string };

type SessionState = { hasToken: boolean; user: CurrentUser | null };

const loadSession = cache(async (): Promise<SessionState> => {
  const token = await readSessionToken();
  if (!token) return { hasToken: false, user: null };
  const session = await verifySession(token, sessionSecret());
  if (!session) return { hasToken: true, user: null };
  // sub vem de token assinado, mas valida o formato antes de ir ao banco
  if (!/^[0-9a-f-]{36}$/i.test(session.sub)) return { hasToken: true, user: null };
  const [row] = await db()<{ id: string; username: string; session_version: number; is_active: boolean }[]>`
    select id, username, session_version, is_active from public.users where id = ${session.sub}::uuid`;
  if (!row || !row.is_active || row.session_version !== session.ver) return { hasToken: true, user: null };
  return { hasToken: true, user: { id: row.id, username: row.username } };
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await loadSession()).user;
}

/** Garante usuário logado e ativo (confere o banco). Chamar ANTES de qualquer SQL do painel. */
export async function requireUser(): Promise<CurrentUser> {
  const s = await loadSession();
  if (s.user) return s.user;
  // Token presente mas rejeitado (versão antiga, usuário inativo): passa por /logout para limpar
  // o cookie e evitar loop com o proxy.
  redirect(s.hasToken ? "/logout" : "/login");
}
