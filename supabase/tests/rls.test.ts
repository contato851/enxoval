/**
 * Testes de RLS: uma família nunca enxerga nem altera a lista de outra.
 *
 * Rodam contra um Postgres real indicado em RLS_DATABASE_URL (superusuário).
 * O teste cria um banco temporário, aplica supabase-stub.sql + as migrations
 * e apaga o banco no fim. Sem a variável, os testes são pulados.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ADMIN_URL = process.env.RLS_DATABASE_URL;
const MIGRATIONS = join(__dirname, "..", "migrations");

const ana = randomUUID(); // dona da família 1
const bruno = randomUUID(); // parceiro da Ana, entra por convite
const carla = randomUUID(); // dona da família 2
const intruso = randomUUID(); // conta sem lista nenhuma

let admin: Client;
let db: Client;
let dbName: string;
let listaAna: string;
let listaCarla: string;
let catAna: string;
let catCarla: string;
let itemAna: string;

async function asUser<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) {
  await db.query("begin");
  try {
    await db.query(`set local role ${uid ? "authenticated" : "anon"}`);
    if (uid) {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: uid, role: "authenticated" }),
      ]);
    }
    const res = await db.query(sql, params);
    await db.query("commit");
    return res as unknown as { rows: T[]; rowCount: number };
  } catch (err) {
    await db.query("rollback");
    throw err;
  }
}

describe.skipIf(!ADMIN_URL)("RLS entre famílias", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    dbName = `enxoval_rls_${Date.now()}`;
    await admin.query(`create database ${dbName}`);
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${dbName}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();

    await db.query(readFileSync(join(__dirname, "supabase-stub.sql"), "utf8"));
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
      await db.query(readFileSync(join(MIGRATIONS, file), "utf8"));
    }

    for (const [id, email] of [
      [ana, "ana@exemplo.com"],
      [bruno, "bruno@exemplo.com"],
      [carla, "carla@exemplo.com"],
      [intruso, "intruso@exemplo.com"],
    ]) {
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    }

    listaAna = (await asUser<{ id: string }>(ana, "select public.create_list('Bebê da Ana', 'bebe', '2027-01-10') as id")).rows[0].id;
    listaCarla = (await asUser<{ id: string }>(carla, "select public.create_list('Bebê da Carla') as id")).rows[0].id;
    catAna = (await asUser<{ id: string }>(ana, "select id from categories where list_id = $1 order by ordem limit 1", [listaAna])).rows[0].id;
    catCarla = (await asUser<{ id: string }>(carla, "select id from categories where list_id = $1 order by ordem limit 1", [listaCarla])).rows[0].id;
    itemAna = (
      await asUser<{ id: string }>(
        ana,
        "insert into items (list_id, category_id, nome, url_original, preco) values ($1, $2, 'Body RN', 'https://www.loja.com.br/p/1', 39.9) returning id",
        [listaAna, catAna],
      )
    ).rows[0].id;
    await asUser(ana, "insert into item_images (item_id, list_id, caminho) values ($1, $2, $3)", [
      itemAna,
      listaAna,
      `${listaAna}/${itemAna}/a.webp`,
    ]);
    await db.query("insert into storage.objects (bucket_id, name) values ('item-images', $1)", [
      `${listaAna}/${itemAna}/a.webp`,
    ]);
  });

  afterAll(async () => {
    await db?.end();
    if (admin) {
      await admin.query(`drop database if exists ${dbName} with (force)`);
      await admin.end();
    }
  });

  it("cria a lista com o dono e as 8 categorias do template", async () => {
    const cats = await asUser(ana, "select nome, mostra_tamanhos from categories where list_id = $1 order by ordem", [listaAna]);
    expect(cats.rows).toHaveLength(8);
    expect(cats.rows[0]).toEqual({ nome: "Roupas", mostra_tamanhos: true });
    const membros = await asUser(ana, "select papel from list_members where list_id = $1", [listaAna]);
    expect(membros.rows).toEqual([{ papel: "dono" }]);
  });

  it("deriva loja e url_saida da URL original", async () => {
    const r = await asUser(ana, "select loja, url_saida from items where id = $1", [itemAna]);
    expect(r.rows[0]).toEqual({ loja: "loja.com.br", url_saida: "https://www.loja.com.br/p/1" });
  });

  it("outra família não lê nada da lista", async () => {
    for (const [tabela, coluna] of [
      ["lists", "id"],
      ["list_members", "list_id"],
      ["categories", "list_id"],
      ["items", "list_id"],
      ["item_images", "list_id"],
      ["list_invites", "list_id"],
      ["link_clicks", "list_id"],
    ]) {
      const r = await asUser(carla, `select * from ${tabela} where ${coluna} = $1`, [listaAna]);
      expect(r.rows, tabela).toHaveLength(0);
    }
    const membros = await asUser(carla, "select * from public.list_members_with_email($1)", [listaAna]);
    expect(membros.rows).toHaveLength(0);
  });

  it("outra família não altera nem apaga", async () => {
    const up = await asUser(carla, "update items set status = 'comprado' where id = $1", [itemAna]);
    expect(up.rowCount).toBe(0);
    const del = await asUser(carla, "delete from items where id = $1", [itemAna]);
    expect(del.rowCount).toBe(0);
    const delLista = await asUser(carla, "delete from lists where id = $1", [listaAna]);
    expect(delLista.rowCount).toBe(0);
    const delCat = await asUser(carla, "delete from categories where list_id = $1", [listaAna]);
    expect(delCat.rowCount).toBe(0);
  });

  it("outra família não cria itens, categorias nem cliques na lista", async () => {
    await expect(
      asUser(carla, "insert into items (list_id, category_id, nome) values ($1, $2, 'x')", [listaAna, catAna]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(carla, "insert into categories (list_id, nome) values ($1, 'x')", [listaAna]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(carla, "insert into link_clicks (list_id, item_id, user_id) values ($1, $2, $3)", [listaAna, itemAna, carla]),
    ).rejects.toThrow(/row-level security/);
  });

  it("não dá para usar categoria de outra lista", async () => {
    await expect(
      asUser(carla, "insert into items (list_id, category_id, nome) values ($1, $2, 'x')", [listaCarla, catAna]),
    ).rejects.toThrow(/foreign key/);
  });

  it("Storage: outra família não lê nem envia imagens na pasta da lista", async () => {
    const r = await asUser(carla, "select name from storage.objects where bucket_id = 'item-images'");
    expect(r.rows).toHaveLength(0);
    await expect(
      asUser(carla, "insert into storage.objects (bucket_id, name) values ('item-images', $1)", [`${listaAna}/x/y.webp`]),
    ).rejects.toThrow(/row-level security/);
    const propria = await asUser(ana, "select name from storage.objects where bucket_id = 'item-images'");
    expect(propria.rows).toHaveLength(1);
  });

  it("visitante sem login não lê nada", async () => {
    await expect(asUser(null, "select * from lists")).rejects.toThrow(/permission denied/);
    await expect(asUser(null, "select * from items")).rejects.toThrow(/permission denied/);
  });

  it("conta sem lista não enxerga nada", async () => {
    const r = await asUser(intruso, "select * from items");
    expect(r.rows).toHaveLength(0);
  });

  it("convite: só o dono cria, vale uma vez e dá acesso de editor", async () => {
    await expect(asUser(carla, "select public.create_invite($1)", [listaAna])).rejects.toThrow(/sem_permissao/);

    const token = (await asUser<{ t: string }>(ana, "select public.create_invite($1) as t", [listaAna])).rows[0].t;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const guardado = await asUser<{ token_hash: string }>(ana, "select token_hash from list_invites where list_id = $1", [listaAna]);
    expect(guardado.rows[0].token_hash).not.toBe(token);

    const prev = await asUser(bruno, "select * from public.invite_preview($1)", [token]);
    expect(prev.rows[0]).toEqual({ list_nome: "Bebê da Ana", valido: true });

    const lista = (await asUser<{ id: string }>(bruno, "select public.accept_invite($1) as id", [token])).rows[0].id;
    expect(lista).toBe(listaAna);
    const itens = await asUser(bruno, "select id from items where list_id = $1", [listaAna]);
    expect(itens.rows).toHaveLength(1);

    await expect(asUser(carla, "select public.accept_invite($1)", [token])).rejects.toThrow(/convite_invalido/);
    await expect(asUser(carla, "select public.accept_invite('nao-existe')")).rejects.toThrow(/convite_invalido/);
  });

  it("convite expirado não vale", async () => {
    const token = (await asUser<{ t: string }>(ana, "select public.create_invite($1) as t", [listaAna])).rows[0].t;
    await db.query("update list_invites set expira_em = now() - interval '1 minute' where usado_em is null");
    await expect(asUser(carla, "select public.accept_invite($1)", [token])).rejects.toThrow(/convite_invalido/);
  });

  it("editor mexe nos itens mas não administra a lista", async () => {
    const up = await asUser(bruno, "update items set status = 'comprado' where id = $1", [itemAna]);
    expect(up.rowCount).toBe(1);
    const ren = await asUser(bruno, "update lists set nome = 'x' where id = $1", [listaAna]);
    expect(ren.rowCount).toBe(0);
    const del = await asUser(bruno, "delete from lists where id = $1", [listaAna]);
    expect(del.rowCount).toBe(0);
    await expect(asUser(bruno, "select public.create_invite($1)", [listaAna])).rejects.toThrow(/sem_permissao/);
    const tirarDona = await asUser(bruno, "delete from list_members where list_id = $1 and user_id = $2", [listaAna, ana]);
    expect(tirarDona.rowCount).toBe(0);
  });

  it("colunas reservadas para o futuro não são editáveis pelo app", async () => {
    await expect(asUser(ana, "update lists set plano = 'premium' where id = $1", [listaAna])).rejects.toThrow(/permission denied/);
    await expect(asUser(ana, "update lists set publico = true where id = $1", [listaAna])).rejects.toThrow(/permission denied/);
    await expect(asUser(ana, "update items set url_saida = 'https://afiliado.exemplo' where id = $1", [itemAna])).rejects.toThrow(/permission denied/);
    await expect(asUser(ana, "insert into list_members (list_id, user_id) values ($1, $2)", [listaAna, carla])).rejects.toThrow(/permission denied/);
  });

  it("no máximo 4 imagens por item", async () => {
    for (const n of ["b", "c", "d"]) {
      await asUser(ana, "insert into item_images (item_id, list_id, caminho) values ($1, $2, $3)", [itemAna, listaAna, `${listaAna}/${itemAna}/${n}.webp`]);
    }
    await expect(
      asUser(ana, "insert into item_images (item_id, list_id, caminho) values ($1, $2, $3)", [itemAna, listaAna, `${listaAna}/${itemAna}/e.webp`]),
    ).rejects.toThrow(/limite_imagens/);
  });

  it("limite de requisições por minuto", async () => {
    const chamar = async () =>
      (await asUser<{ ok: boolean }>(carla, "select public.check_rate_limit('teste', 2, 100) as ok")).rows[0].ok;
    expect(await chamar()).toBe(true);
    expect(await chamar()).toBe(true);
    expect(await chamar()).toBe(false);
  });

  it("excluir conta: lista compartilhada passa ao parceiro, lista solitária é apagada", async () => {
    const caminhosAna = await asUser<{ p: string }>(ana, "select public.delete_account_data() as p");
    expect(caminhosAna.rows).toHaveLength(0); // a lista da Ana continua com o Bruno
    const membros = await asUser(bruno, "select user_id, papel from list_members where list_id = $1", [listaAna]);
    expect(membros.rows).toEqual([{ user_id: bruno, papel: "dono" }]);

    const itemCarla = (
      await asUser<{ id: string }>(carla, "insert into items (list_id, category_id, nome) values ($1, $2, 'Carrinho') returning id", [listaCarla, catCarla])
    ).rows[0].id;
    const caminho = `${listaCarla}/${itemCarla}/a.webp`;
    await asUser(carla, "insert into item_images (item_id, list_id, caminho) values ($1, $2, $3)", [itemCarla, listaCarla, caminho]);
    const caminhosCarla = await asUser<{ p: string }>(carla, "select public.delete_account_data() as p");
    expect(caminhosCarla.rows).toEqual([{ p: caminho }]);
    const sobrou = await db.query("select count(*)::int as n from lists where id = $1", [listaCarla]);
    expect(sobrou.rows[0].n).toBe(0);
  });
});
