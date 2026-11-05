-- Usuários do painel (sem cadastro público) e tentativas de login.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9._-]{2,32}$'),
  password_hash text not null,             -- formato: scrypt$N$r$p$salt_b64url$hash_b64url
  session_version int not null default 1,  -- incrementar invalida todas as sessões do usuário
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Sem IP (LGPD): só o nome digitado (normalizado) e o resultado.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  username text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index on public.login_attempts (username, attempted_at desc);

alter table public.destination_history
  add constraint destination_history_changed_by_fkey
  foreign key (changed_by) references public.users(id) on delete set null;

alter table public.users enable row level security;
alter table public.login_attempts enable row level security;

select public.revoke_api_roles();
