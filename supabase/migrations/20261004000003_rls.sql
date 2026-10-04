-- RLS: só membros de uma lista enxergam e alteram os dados dela.

create function public.is_list_member(p_list uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = p_list and m.user_id = (select auth.uid())
  );
$$;

create function public.is_list_owner(p_list uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id = p_list and m.user_id = (select auth.uid()) and m.papel = 'dono'
  );
$$;

-- Versão para o Storage, onde a primeira pasta do caminho é o list_id (texto).
create function public.is_list_member_text(p_list text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.list_members m
    where m.list_id::text = p_list and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_list_member(uuid) from public, anon;
revoke execute on function public.is_list_owner(uuid) from public, anon;
revoke execute on function public.is_list_member_text(text) from public, anon;
grant execute on function public.is_list_member(uuid) to authenticated;
grant execute on function public.is_list_owner(uuid) to authenticated;
grant execute on function public.is_list_member_text(text) to authenticated;

alter table public.list_templates enable row level security;
alter table public.list_template_categories enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_invites enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.link_clicks enable row level security;
alter table public.rate_limits enable row level security;

-- Visitantes sem login não acessam nada na v1.
revoke all on all tables in schema public from anon;

-- Templates: leitura para qualquer usuário logado.
create policy "templates: leitura" on public.list_templates
  for select to authenticated using (true);
create policy "template_categories: leitura" on public.list_template_categories
  for select to authenticated using (true);

-- Listas: criadas pela função create_list; dono altera e exclui.
create policy "lists: membros leem" on public.lists
  for select to authenticated using ((select public.is_list_member(id)));
create policy "lists: dono altera" on public.lists
  for update to authenticated
  using ((select public.is_list_owner(id)))
  with check ((select public.is_list_owner(id)));
create policy "lists: dono exclui" on public.lists
  for delete to authenticated using ((select public.is_list_owner(id)));
-- Só nome e data prevista são editáveis pelo app (plano, publico e slug ficam para o futuro).
revoke insert, update on public.lists from authenticated;
grant update (nome, data_prevista) on public.lists to authenticated;

-- Membros: entram por create_list ou accept_invite.
create policy "list_members: membros leem" on public.list_members
  for select to authenticated using ((select public.is_list_member(list_id)));
create policy "list_members: dono remove outros, membro sai" on public.list_members
  for delete to authenticated using (
    ((select public.is_list_owner(list_id)) and user_id <> (select auth.uid()))
    or (user_id = (select auth.uid()) and papel <> 'dono')
  );
revoke insert, update on public.list_members from authenticated;

-- Convites: só o dono vê e revoga; criados por create_invite.
create policy "list_invites: dono le" on public.list_invites
  for select to authenticated using ((select public.is_list_owner(list_id)));
create policy "list_invites: dono revoga" on public.list_invites
  for delete to authenticated using ((select public.is_list_owner(list_id)));
revoke insert, update on public.list_invites from authenticated;

-- Categorias, itens e imagens: qualquer membro.
create policy "categories: membros leem" on public.categories
  for select to authenticated using ((select public.is_list_member(list_id)));
create policy "categories: membros criam" on public.categories
  for insert to authenticated with check ((select public.is_list_member(list_id)));
create policy "categories: membros alteram" on public.categories
  for update to authenticated
  using ((select public.is_list_member(list_id)))
  with check ((select public.is_list_member(list_id)));
create policy "categories: membros excluem" on public.categories
  for delete to authenticated using ((select public.is_list_member(list_id)));

create policy "items: membros leem" on public.items
  for select to authenticated using ((select public.is_list_member(list_id)));
create policy "items: membros criam" on public.items
  for insert to authenticated with check ((select public.is_list_member(list_id)));
create policy "items: membros alteram" on public.items
  for update to authenticated
  using ((select public.is_list_member(list_id)))
  with check ((select public.is_list_member(list_id)));
create policy "items: membros excluem" on public.items
  for delete to authenticated using ((select public.is_list_member(list_id)));
-- Colunas que o app pode gravar (privilégio por coluna; o resto vem de default/trigger).
revoke insert, update on public.items from authenticated;
grant insert (list_id, category_id, nome, url_original, preco, quantidade, tamanho,
              prioridade, status, observacoes)
  on public.items to authenticated;
grant update (category_id, nome, url_original, preco, quantidade, tamanho,
              prioridade, status, observacoes)
  on public.items to authenticated;
revoke update on public.categories from authenticated;
grant update (nome, icone, ordem, mostra_tamanhos) on public.categories to authenticated;

create policy "item_images: membros leem" on public.item_images
  for select to authenticated using ((select public.is_list_member(list_id)));
create policy "item_images: membros criam" on public.item_images
  for insert to authenticated with check ((select public.is_list_member(list_id)));
create policy "item_images: membros alteram" on public.item_images
  for update to authenticated
  using ((select public.is_list_member(list_id)))
  with check ((select public.is_list_member(list_id)));
create policy "item_images: membros excluem" on public.item_images
  for delete to authenticated using ((select public.is_list_member(list_id)));
revoke update on public.item_images from authenticated;
grant update (ordem) on public.item_images to authenticated;

-- Cliques: membro registra o próprio clique e lê os da lista.
create policy "link_clicks: membro registra" on public.link_clicks
  for insert to authenticated
  with check ((select public.is_list_member(list_id)) and user_id = (select auth.uid()));
create policy "link_clicks: membros leem" on public.link_clicks
  for select to authenticated using ((select public.is_list_member(list_id)));
revoke update, delete on public.link_clicks from authenticated;

-- rate_limits: sem policies; só a função check_rate_limit mexe.
revoke all on public.rate_limits from authenticated;
