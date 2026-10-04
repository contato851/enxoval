# Enxoval

Listas de compras colaborativas montadas a partir de links de lojas, com preview de imagem.
Primeiro caso de uso: um casal organizando as compras para a chegada do primeiro filho.
A arquitetura já é multi-família (várias listas, membros por lista, RLS em tudo).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, Realtime) · Vercel.

---

## Sumário

1. [O que tem na v1](#o-que-tem-na-v1)
2. [Rodar localmente](#rodar-localmente)
3. [Configurar o Supabase (produção)](#configurar-o-supabase-produção)
4. [Deploy na Vercel](#deploy-na-vercel)
5. [Instalar no iPhone](#instalar-no-iphone)
6. [Testes](#testes)
7. [Como as coisas funcionam](#como-as-coisas-funcionam)
8. [Estrutura de pastas](#estrutura-de-pastas)

---

## O que tem na v1

- Login por **magic link**, restrito por `ALLOWED_EMAILS` (sem a variável, o cadastro fica aberto).
- **Listas multi-família**: dono e editores; convite do parceiro por link de uso único (7 dias).
- Lista criada a partir de um **template** ("bebê", com 8 categorias editáveis).
- Cadastro de item com **preview de link**: cola o link, o servidor lê a página e preenche nome, preço e fotos (Open Graph + JSON-LD + extratores por loja). Até 4 imagens por item, baixadas e redimensionadas para o Storage (sem hotlink).
- **Plano B**: se a loja bloquear, mensagem clara + colar URL de imagem ou enviar foto do aparelho. Item pode ficar sem imagem (placeholder).
- **Cards padronizados** (mesma altura, imagem 1:1 com carrossel), abas por categoria com contador, filtros, busca, resumo com contagem regressiva e totais, peças por tamanho (RN/P/M/G).
- **Tempo real** entre os membros (Supabase Realtime).
- Rota `/ir/<item>` registra cada clique em link de loja e redireciona para `url_saida` (pronta para afiliados).
- **PWA** instalável (Safari: "Adicionar à Tela de Início"), botão "Colar link" de um toque.
- Exclusão de item, categoria (move os itens), lista e **conta**.
- Todos os textos em `src/i18n/pt-BR.ts`; todos os tokens visuais em `src/styles/tokens.css`.

**Preparado, mas fora da v1** (colunas já existem, nada exposto): página pública de presentes (`lists.publico`, `lists.public_slug`, `items.visivel_publico`), afiliados (`items.url_saida`), planos pagos (`lists.plano`), outros tipos de lista (novos registros em `list_templates`).

---

## Rodar localmente

Pré-requisitos: Node 20.9+, Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe Postgres, Auth, Storage, Realtime e aplica as migrations
cp .env.example .env.local  # e preencha com o que o comando acima mostrou
npm run dev
```

No `.env.local` local:

| Variável | Valor local |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `Publishable key` mostrada pelo `supabase start` |
| `SUPABASE_SERVICE_ROLE_KEY` | `Secret key` mostrada pelo `supabase start` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `ALLOWED_EMAILS` | seus emails, separados por vírgula |

Os emails de login caem no Mailpit local: <http://127.0.0.1:54324>.

---

## Configurar o Supabase (produção)

1. Crie um projeto em <https://supabase.com/dashboard> (região São Paulo, de preferência).
2. Aplique as migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
   (Ou cole os arquivos de `supabase/migrations/` em ordem no SQL Editor.)
3. **Authentication → URL Configuration**
   - *Site URL*: `https://SEU-APP.vercel.app`
   - *Redirect URLs*: `https://SEU-APP.vercel.app/auth/callback` (e `http://localhost:3000/auth/callback` para desenvolvimento).
4. **Authentication → Emails → SMTP**: o envio padrão do Supabase tem limite baixo de emails por hora, que acaba rápido com magic link. Para uso real configure um SMTP próprio (Resend, Brevo, Amazon SES...).
5. **Project Settings → API Keys**: copie a *Publishable key* e a *Secret key* para as variáveis de ambiente.
6. (Opcional) Traduza o template do email em *Authentication → Emails → Magic Link*. Mantenha o link `{{ .ConfirmationURL }}`.

O bucket `item-images` (privado) e as policies do Storage são criados pela migration `…05_storage.sql`.

---

## Deploy na Vercel

1. Importe o repositório em <https://vercel.com/new> (framework: Next.js, sem ajustes).
2. Em *Settings → Environment Variables*, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (só servidor; nunca com prefixo `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_SITE_URL` = `https://SEU-APP.vercel.app`
   - `ALLOWED_EMAILS` = os emails de vocês dois
3. Deploy. Depois, volte ao passo 3 do Supabase se o domínio mudou.
4. Teste o preview com links reais **a partir da Vercel** (o IP de saída muda o comportamento das lojas): cadastre um item colando um link de cada loja.

Para abrir o cadastro para qualquer pessoa no futuro, apague `ALLOWED_EMAILS` e faça redeploy. Nada no código muda.

---

## Instalar no iPhone

Abra o app no Safari → botão Compartilhar → **Adicionar à Tela de Início**. Ele abre em tela cheia, com ícone próprio.

O Safari não suporta "compartilhar para o app" (Web Share Target). O fluxo no iPhone é: na loja, *Compartilhar → Copiar*; no Enxoval, **Adicionar item → Colar link** (um toque).

---

## Testes

```bash
npm test             # extração, SSRF, preço, regras da lista (+ RLS se RLS_DATABASE_URL existir)
npm run test:rls     # só RLS
npm run lint
npm run typecheck
```

- **RLS** (`supabase/tests/rls.test.ts`): cria um banco temporário, aplica as migrations e confere com usuários reais que uma família não lê, não altera, não apaga e não envia imagens para a lista de outra; que convites valem uma vez; que editor não administra a lista; que colunas reservadas não são graváveis; e a exclusão de conta. Precisa de um Postgres com superusuário em `RLS_DATABASE_URL` (o do `supabase start` serve: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`).
- **Links reais**: `npm run preview:testar -- <link1> <link2> ...` mostra para cada link se funcionou ou cai no plano B. Rode numa máquina com acesso às lojas.

---

## Como as coisas funcionam

### Segurança
- `src/proxy.ts` renova a sessão em toda requisição e barra quem não está logado ou fora da allowlist. O callback do magic link confere a allowlist de novo.
- Toda tabela tem RLS por `list_id` (`is_list_member` / `is_list_owner`). Privilégios por coluna impedem o app de gravar `plano`, `publico`, `url_saida` etc.
- Criar lista, convidar, aceitar convite e excluir conta passam por funções SQL que validam o usuário.
- A chave secreta só é usada no servidor, para excluir a conta (arquivos + usuário do Auth).

### Preview de link (`src/lib/extraction/`)
- Interface única: `extractProduct(url) → { titulo, preco, imagens, loja }`. Trocar por um serviço externo = reimplementar essa função.
- Genérico (JSON-LD Product → Open Graph → Twitter → microdata → `<title>`) + extratores por loja em `stores/` (Amazon, Mercado Livre, Magalu, Shopee).
- `safe-fetch.ts`: só http/https nas portas 80/443, resolve o DNS e recusa IPs internos (IPv4 e IPv6, metadados de nuvem), conecta no IP validado (sem DNS rebinding), revalida até 3 redirecionamentos, 8 s de timeout, HTML limitado a 2 MB, imagens a 10 MB.
- `/api/preview` exige sessão e limita 20 buscas/minuto e 200/dia por usuário (contado no banco).

### Imagens
`/api/images` recebe arquivo ou URL, converte para WebP (máx. 1200 px, sem EXIF/GPS) e salva em `item-images/<list_id>/<item_id>/<uuid>.webp` (bucket privado, URLs assinadas).

### Valores do resumo
Valor = preço × quantidade. **Previsto** = comprado + a comprar. **Já gasto** = comprado. **Falta** = a comprar. Itens "ganhamos" contam no progresso, mas não em valores.

---

## Estrutura de pastas

```
supabase/migrations/   tabelas, triggers, RLS, funções, storage, realtime, template
supabase/tests/        testes de RLS
scripts/               testar-preview.ts, gerar-icones.mjs
src/proxy.ts           sessão + proteção das rotas
src/i18n/              textos da interface
src/styles/tokens.css  cores, espaçamentos, raios, tipografia
src/app/               rotas (login, listas, l/[listId]/..., convite, conta, ir, api)
src/components/        ui/, items/, categories/, lists/, summary/, filters/, layout/
src/hooks/             useListData (carga + tempo real)
src/lib/               supabase/, extraction/, images/, lista.ts (regras), format.ts
tests/                 extração, SSRF, preço, regras da lista
```
