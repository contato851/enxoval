-- Triggers: atualizado_em, loja/url_saida derivadas da URL, autor, limite de imagens.

create function public.dominio_da_url(p_url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(lower(substring(p_url from '^[a-zA-Z]+://([^/:?#]+)')), '^www\.', ''),
    ''
  );
$$;

create function public.items_antes_de_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.loja := public.dominio_da_url(new.url_original);

  if tg_op = 'INSERT' then
    new.criado_por := coalesce((select auth.uid()), new.criado_por);
    new.url_saida := coalesce(new.url_saida, new.url_original);
  else
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
    new.atualizado_em := now();
    -- Se a URL original mudou e a de saída ainda era a antiga, acompanha.
    if new.url_original is distinct from old.url_original
       and (old.url_saida is not distinct from old.url_original) then
      new.url_saida := new.url_original;
    end if;
    if new.url_original is null then
      new.url_saida := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger items_antes_de_gravar
before insert or update on public.items
for each row execute function public.items_antes_de_gravar();

create function public.item_images_limite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serializa inserções do mesmo item para o limite valer mesmo com envios simultâneos.
  perform pg_advisory_xact_lock(hashtext(new.item_id::text));
  if (select count(*) from public.item_images where item_id = new.item_id) >= 4 then
    raise exception 'limite_imagens' using errcode = 'check_violation',
      hint = 'Cada item pode ter no máximo 4 imagens.';
  end if;
  return new;
end;
$$;

create trigger item_images_limite
before insert on public.item_images
for each row execute function public.item_images_limite();
