-- Funções de negócio (todas security definer, search_path vazio)

create function public.reserved_slugs()
returns text[]
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  return array[
    'admin','api','app','auth','login','logout','painel','dashboard','r','s','qr','nfc',
    'static','assets','_next','public','www','mail','help','ajuda','suporte','termos',
    'privacidade','null','undefined','test','teste'
  ];
end;
$$;

create function public.gen_random_slug(p_len int default 7)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz'; -- 31 caracteres, sem 0 o 1 l i
  b bytea;
  result text := '';
  i int;
begin
  b := extensions.gen_random_bytes(p_len);
  for i in 0 .. p_len - 1 loop
    result := result || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return result;
end;
$$;

create function public.create_link(
  p_slug text,
  p_kind text,
  p_label text,
  p_client_id uuid,
  p_destination_url text
)
returns public.links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := nullif(trim(coalesce(p_slug, '')), '');
  v_dest text := nullif(trim(coalesce(p_destination_url, '')), '');
  v_link public.links;
  v_try int := 0;
begin
  if v_slug is null then
    loop
      v_try := v_try + 1;
      v_slug := public.gen_random_slug();
      exit when not exists (select 1 from public.link_slugs where slug = v_slug)
            and not (v_slug = any (public.reserved_slugs()));
      if v_try >= 10 then
        raise exception 'slug_generation_failed' using errcode = 'P0001';
      end if;
    end loop;
  else
    if v_slug = any (public.reserved_slugs()) then
      raise exception 'slug_reserved' using errcode = 'P0001';
    end if;
  end if;

  insert into public.links (slug, kind, label, client_id, destination_url, status)
  values (
    v_slug,
    coalesce(p_kind, 'outro'),
    nullif(trim(coalesce(p_label, '')), ''),
    p_client_id,
    v_dest,
    case when v_dest is not null then 'active'::public.link_status
         else 'unassigned'::public.link_status end
  )
  returning * into v_link;

  insert into public.link_slugs (slug, link_id, is_primary)
  values (v_slug, v_link.id, true);

  return v_link;
end;
$$;

create function public.create_links_batch(
  p_quantity int,
  p_name text,
  p_kind text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_link public.links;
  i int;
begin
  insert into public.batches (name, kind, quantity, request_id)
  values (trim(p_name), coalesce(p_kind, 'outro'), p_quantity, p_request_id)
  on conflict (request_id) do nothing
  returning id into v_id;

  if v_id is null then
    -- operação idempotente: devolve o lote já existente
    select b.id into v_id from public.batches b where b.request_id = p_request_id;
    return v_id;
  end if;

  for i in 1 .. p_quantity loop
    v_link := public.create_link(null, coalesce(p_kind, 'outro'), null, null, null);
    update public.links set batch_id = v_id where id = v_link.id;
  end loop;

  return v_id;
end;
$$;

create function public.change_slug(p_link_id uuid, p_new_slug text)
returns public.links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.links;
  v_used boolean;
  v_is_own_alias boolean;
begin
  select * into v_link from public.links where id = p_link_id for update;
  if not found then
    raise exception 'link_not_found' using errcode = 'P0002';
  end if;

  if p_new_slug = v_link.slug then
    return v_link;
  end if;

  if p_new_slug = any (public.reserved_slugs()) then
    raise exception 'slug_reserved' using errcode = 'P0001';
  end if;

  v_used := v_link.printed_at is not null
    or exists (select 1 from public.scans s where s.link_id = p_link_id and not s.is_bot);

  v_is_own_alias := exists (
    select 1 from public.link_slugs ls where ls.slug = p_new_slug and ls.link_id = p_link_id
  );

  if v_used then
    -- já impresso/acessado: o slug antigo vira alias permanente
    update public.link_slugs set is_primary = false
      where link_id = p_link_id and is_primary;
  else
    delete from public.link_slugs where link_id = p_link_id and is_primary;
  end if;

  if v_is_own_alias then
    update public.link_slugs set is_primary = true where slug = p_new_slug;
  else
    insert into public.link_slugs (slug, link_id, is_primary)
    values (p_new_slug, p_link_id, true);
  end if;

  update public.links set slug = p_new_slug where id = p_link_id
  returning * into v_link;

  return v_link;
end;
$$;

create function public.resolve_slug(p_slug text)
returns table (
  link_id uuid,
  status public.link_status,
  destination_url text,
  is_alias boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select ls.link_id, l.status, l.destination_url, not ls.is_primary
    from public.link_slugs ls
    join public.links l on l.id = ls.link_id
    where ls.slug = p_slug;
end;
$$;

-- Permissões: o app conecta como dono do schema; ninguém mais executa.
-- (Roles do Supabase, se existirem, são tratadas em 20261006000003_security.sql.)
revoke execute on function public.reserved_slugs() from public;
revoke execute on function public.gen_random_slug(int) from public;
revoke execute on function public.create_link(text, text, text, uuid, text) from public;
revoke execute on function public.create_links_batch(int, text, text, uuid) from public;
revoke execute on function public.change_slug(uuid, text) from public;
revoke execute on function public.resolve_slug(text) from public;
