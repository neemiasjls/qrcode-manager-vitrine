"use server";

import { redirect } from "next/navigation";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password.mjs";
import { normalizeUsername } from "@/lib/auth/username";
import { signSession } from "@/lib/auth/session";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/cookies";
import { db } from "@/lib/db";
import { sessionSecret } from "@/lib/env-server";

export type LoginState = { error?: string };

const GENERIC_ERROR = "Usuário ou senha inválidos";
const LOCKED_ERROR = "Muitas tentativas. Aguarde 15 minutos e tente de novo.";
const MAX_FAILS = 10;

type UserRow = { id: string; username: string; password_hash: string; session_version: number; is_active: boolean };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username || !password || password.length > 200) return { error: GENERIC_ERROR };

  const sql = db();

  const [{ fails }] = await sql<{ fails: number }[]>`
    select count(*)::int as fails from public.login_attempts
    where username = ${username} and not succeeded and attempted_at > now() - interval '15 minutes'`;
  if (fails >= MAX_FAILS) return { error: LOCKED_ERROR };

  const [user] = await sql<UserRow[]>`
    select id, username, password_hash, session_version, is_active
    from public.users where username = ${username}`;
  const usable = user && user.is_active ? user : null;
  const ok = await verifyPassword(password, usable ? usable.password_hash : DUMMY_HASH);
  const succeeded = Boolean(usable) && ok;

  await sql`insert into public.login_attempts (username, succeeded) values (${username}, ${succeeded})`;
  await sql`delete from public.login_attempts where attempted_at < now() - interval '1 day'`;

  if (!succeeded || !usable) return { error: GENERIC_ERROR };

  const token = await signSession(
    { sub: usable.id, username: usable.username, ver: usable.session_version },
    sessionSecret(),
  );
  await setSessionCookie(token);
  redirect("/painel");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
