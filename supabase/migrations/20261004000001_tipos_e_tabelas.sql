-- Enxoval: tipos e tabelas.
-- Todo dado pertence a uma lista (list_id). O acesso é liberado por RLS (ver 0003).

create type public.papel_membro as enum ('dono', 'editor');
create type public.item_prioridade as enum ('essencial', 'pode_esperar');
create type public.item_status as enum ('a_comprar', 'comprado', 'ganhamos');

-- Templates: cada tipo de lista (bebe, futuramente casamento, casa nova...) tem categorias padrão.
create table public.list_templates (
  tipo text primary key check (tipo ~ '^[a-z_]{2,30}$'),
  nome text not null
);

create table public.list_template_categories (
  id uuid primary key default gen_random_uuid(),
  tipo text not null references public.list_templates (tipo) on delete cascade,
  nome text not null,
  icone text not null,
  ordem int not null,
  mostra_tamanhos boolean not null default false,
  unique (tipo, ordem)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  tipo text not null references public.list_templates (tipo),
  data_prevista date,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Preparado para a futura página pública de presentes (fora da v1).
  publico boolean not null default false,
  public_slug text unique check (public_slug ~ '^[a-z0-9-]{3,60}$'),
  -- Preparado para planos pagos (fora da v1).
  plano text not null default 'gratuito'
);

create table public.list_members (
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_membro not null default 'editor',
  criado_em timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index list_members_user_idx on public.list_members (user_id);

-- Convites de uso único. Só o hash do token fica no banco.
create table public.list_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  token_hash text not null unique,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  usado_em timestamptz,
  usado_por uuid references auth.users (id) on delete set null
);
create index list_invites_list_idx on public.list_invites (list_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 40),
  icone text not null default 'package',
  ordem int not null default 0,
  mostra_tamanhos boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (id, list_id)
);
create index categories_list_idx on public.categories (list_id, ordem);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  category_id uuid not null,
  nome text not null check (char_length(btrim(nome)) between 1 and 200),
  url_original text check (url_original ~* '^https?://' and char_length(url_original) <= 2048),
  -- Link usado no clique. Hoje igual à original; no futuro pode virar link de afiliado.
  url_saida text check (url_saida ~* '^https?://' and char_length(url_saida) <= 2048),
  loja text,
  preco numeric(10, 2) check (preco >= 0),
  quantidade int not null default 1 check (quantidade between 1 and 999),
  tamanho text check (char_length(tamanho) <= 20),
  prioridade public.item_prioridade not null default 'essencial',
  status public.item_status not null default 'a_comprar',
  observacoes text check (char_length(observacoes) <= 2000),
  -- Preparado para a futura página pública de presentes (fora da v1).
  visivel_publico boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, list_id),
  -- A categoria precisa ser da mesma lista do item.
  foreign key (category_id, list_id) references public.categories (id, list_id)
);
create index items_list_idx on public.items (list_id);
create index items_category_idx on public.items (category_id);

create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  list_id uuid not null,
  caminho text not null unique,
  ordem smallint not null default 0 check (ordem between 0 and 3),
  criado_em timestamptz not null default now(),
  foreign key (item_id, list_id) references public.items (id, list_id) on delete cascade
);
create index item_images_item_idx on public.item_images (item_id, ordem);
create index item_images_list_idx on public.item_images (list_id);

-- Registro dos cliques nos links de loja (rota /ir/<item>).
create table public.link_clicks (
  id bigint generated always as identity primary key,
  item_id uuid references public.items (id) on delete set null,
  list_id uuid not null references public.lists (id) on delete cascade,
  loja text,
  user_id uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index link_clicks_list_idx on public.link_clicks (list_id, criado_em desc);

-- Limite de requisições por usuário (funciona em serverless, ao contrário de memória).
create table public.rate_limits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  acao text not null,
  criado_em timestamptz not null default now()
);
create index rate_limits_lookup_idx on public.rate_limits (user_id, acao, criado_em desc);
