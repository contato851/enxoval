-- Funções chamadas pelo app (RPC). Todas validam auth.uid() e o papel do usuário.

-- Cria uma lista, adiciona quem criou como dono e copia as categorias do template.
create function public.create_list(p_nome text, p_tipo text default 'bebe', p_data_prevista date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_list uuid;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '42501';
  end if;
  if (select count(*) from public.list_members where user_id = v_uid and papel = 'dono') >= 20 then
    raise exception 'limite_listas' using errcode = 'check_violation';
  end if;

  insert into public.lists (nome, tipo, data_prevista, criado_por)
  values (btrim(p_nome), p_tipo, p_data_prevista, v_uid)
  returning id into v_list;

  insert into public.list_members (list_id, user_id, papel) values (v_list, v_uid, 'dono');

  insert into public.categories (list_id, nome, icone, ordem, mostra_tamanhos)
  select v_list, t.nome, t.icone, t.ordem, t.mostra_tamanhos
  from public.list_template_categories t
  where t.tipo = p_tipo;

  return v_list;
end;
$$;

-- Gera um convite de uso único. Devolve o token em claro uma única vez; o banco guarda só o hash.
create function public.create_invite(p_list uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not public.is_list_owner(p_list) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  -- 244 bits de aleatoriedade (gen_random_uuid usa gerador criptográfico).
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.list_invites (list_id, token_hash, criado_por)
  values (p_list, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), (select auth.uid()));
  return v_token;
end;
$$;

-- Mostra para quem tem o link qual lista o convite abre (sem dar acesso aos dados).
create function public.invite_preview(p_token text)
returns table (list_nome text, valido boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.nome, (i.usado_em is null and i.expira_em > now())
  from public.list_invites i
  join public.lists l on l.id = i.list_id
  where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- Aceita um convite: o usuário entra como editor e o convite é consumido.
create function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.list_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '42501';
  end if;

  select * into v_invite
  from public.list_invites
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;

  if not found or v_invite.usado_em is not null or v_invite.expira_em <= now() then
    raise exception 'convite_invalido' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.list_members where list_id = v_invite.list_id and user_id = v_uid) then
    return v_invite.list_id; -- já é membro; não gasta o convite
  end if;

  insert into public.list_members (list_id, user_id, papel) values (v_invite.list_id, v_uid, 'editor');
  update public.list_invites set usado_em = now(), usado_por = v_uid where id = v_invite.id;
  return v_invite.list_id;
end;
$$;

-- Membros com email, para a tela de ajustes.
create function public.list_members_with_email(p_list uuid)
returns table (user_id uuid, email text, papel public.papel_membro, criado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.papel, m.criado_em
  from public.list_members m
  join auth.users u on u.id = m.user_id
  where m.list_id = p_list and public.is_list_member(p_list)
  order by m.criado_em;
$$;

-- Move os itens para outra categoria da mesma lista e exclui a categoria.
create function public.delete_category_moving_items(p_category uuid, p_target uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_target is not null then
    update public.items set category_id = p_target where category_id = p_category;
  end if;
  delete from public.categories where id = p_category;
end;
$$;

-- Limite de requisições por usuário e ação. Devolve false quando estourou.
create function public.check_rate_limit(p_acao text, p_por_minuto int, p_por_dia int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text || p_acao));

  delete from public.rate_limits
  where user_id = v_uid and acao = p_acao and criado_em < now() - interval '1 day';

  if (select count(*) from public.rate_limits
      where user_id = v_uid and acao = p_acao and criado_em > now() - interval '1 minute') >= p_por_minuto
     or (select count(*) from public.rate_limits
         where user_id = v_uid and acao = p_acao) >= p_por_dia then
    return false;
  end if;

  insert into public.rate_limits (user_id, acao) values (v_uid, p_acao);
  return true;
end;
$$;

-- Prepara a exclusão da conta do usuário logado:
-- - listas em que ele é o único membro são apagadas;
-- - nas compartilhadas em que ele é dono, o membro mais antigo vira dono.
-- Devolve os caminhos das imagens das listas apagadas, para o servidor remover do Storage.
-- O registro em auth.users é removido depois, pelo servidor, com a chave de serviço.
create function public.delete_account_data()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_list uuid;
begin
  if v_uid is null then
    raise exception 'nao_autenticado' using errcode = '42501';
  end if;

  for v_list in
    select m.list_id from public.list_members m where m.user_id = v_uid
  loop
    if not exists (select 1 from public.list_members where list_id = v_list and user_id <> v_uid) then
      return query select i.caminho from public.item_images i where i.list_id = v_list;
      delete from public.lists where id = v_list;
    else
      if not exists (
        select 1 from public.list_members
        where list_id = v_list and user_id <> v_uid and papel = 'dono'
      ) then
        update public.list_members set papel = 'dono'
        where list_id = v_list and user_id = (
          select user_id from public.list_members
          where list_id = v_list and user_id <> v_uid
          order by criado_em limit 1
        );
      end if;
      delete from public.list_members where list_id = v_list and user_id = v_uid;
    end if;
  end loop;

  delete from public.rate_limits where user_id = v_uid;
end;
$$;

revoke execute on function public.create_list(text, text, date) from public, anon;
revoke execute on function public.create_invite(uuid) from public, anon;
revoke execute on function public.invite_preview(text) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.list_members_with_email(uuid) from public, anon;
revoke execute on function public.delete_category_moving_items(uuid, uuid) from public, anon;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon;
revoke execute on function public.delete_account_data() from public, anon;
revoke execute on function public.dominio_da_url(text) from public, anon;

grant execute on function public.create_list(text, text, date) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.invite_preview(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.list_members_with_email(uuid) to authenticated;
grant execute on function public.delete_category_moving_items(uuid, uuid) to authenticated;
grant execute on function public.check_rate_limit(text, int, int) to authenticated;
grant execute on function public.delete_account_data() to authenticated;
grant execute on function public.dominio_da_url(text) to authenticated;
