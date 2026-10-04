import type { CheerioAPI } from "cheerio";
import { parsePrice } from "./price";
import type { ProdutoExtraido } from "./types";

const MAX_IMAGENS = 8;

type Json = unknown;
type JsonObj = Record<string, Json>;

const isObj = (v: Json): v is JsonObj => typeof v === "object" && v !== null && !Array.isArray(v);
const lista = (v: Json): Json[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

function temTipo(no: JsonObj, ...tipos: string[]) {
  return lista(no["@type"]).some((t) => typeof t === "string" && tipos.includes(t.replace(/^.*[/#]/, "")));
}

/** Acha nós Product/ProductGroup em qualquer lugar do JSON-LD (@graph, arrays, mainEntity). */
function produtosJsonLd($: CheerioAPI): JsonObj[] {
  const achados: JsonObj[] = [];
  const visitar = (no: Json, profundidade: number) => {
    if (profundidade > 6) return;
    if (Array.isArray(no)) return no.forEach((n) => visitar(n, profundidade + 1));
    if (!isObj(no)) return;
    if (temTipo(no, "Product", "ProductGroup", "IndividualProduct")) achados.push(no);
    for (const chave of ["@graph", "mainEntity", "itemListElement", "item"]) {
      if (chave in no) visitar(no[chave], profundidade + 1);
    }
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    const texto = $(el).text().trim();
    if (!texto) return;
    try {
      visitar(JSON.parse(texto), 0);
    } catch {
      // JSON-LD malformado é comum; ignoramos o bloco.
    }
  });
  return achados;
}

function precoDeOfertas(ofertas: Json): number | null {
  for (const o of lista(ofertas)) {
    if (!isObj(o)) continue;
    for (const campo of ["price", "lowPrice", "highPrice"]) {
      const p = parsePrice(o[campo] as Json);
      if (p !== null && p > 0) return p;
    }
    for (const spec of lista(o.priceSpecification)) {
      if (isObj(spec)) {
        const p = parsePrice(spec.price as Json);
        if (p !== null && p > 0) return p;
      }
    }
    if (o.offers) {
      const p = precoDeOfertas(o.offers);
      if (p !== null) return p;
    }
  }
  return null;
}

function imagensJsonLd(v: Json): string[] {
  return lista(v).flatMap((img) => {
    if (typeof img === "string") return [img];
    if (isObj(img)) return [img.contentUrl, img.url].filter((u): u is string => typeof u === "string");
    return [];
  });
}

export function meta($: CheerioAPI, ...nomes: string[]): string | null {
  for (const n of nomes) {
    const v =
      $(`meta[property="${n}"]`).attr("content") ??
      $(`meta[name="${n}"]`).attr("content") ??
      $(`meta[itemprop="${n}"]`).attr("content");
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function metas($: CheerioAPI, ...nomes: string[]): string[] {
  return nomes.flatMap((n) =>
    $(`meta[property="${n}"], meta[name="${n}"]`)
      .map((_, el) => $(el).attr("content")?.trim() ?? "")
      .get()
      .filter(Boolean),
  );
}

/** Deixa só URLs http(s) absolutas e sem repetição. */
export function normalizarImagens(urls: string[], base: URL): string[] {
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const bruto of urls) {
    if (!bruto || bruto.startsWith("data:")) continue;
    try {
      const u = new URL(bruto.trim(), base);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      const chave = u.toString();
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      saida.push(chave);
    } catch {
      // ignora URL inválida
    }
    if (saida.length >= MAX_IMAGENS) break;
  }
  return saida;
}

const SUFIXOS_LOJA =
  /\s*[|\-–—:]\s*(mercado\s*livre|mercadolivre|magazine\s*luiza|magalu|amazon\.com\.br|amazon|shopee(\s*brasil)?|americanas|casas\s*bahia)\b.*$/i;

export function limparTitulo(t: string | null | undefined): string | null {
  if (!t) return null;
  const limpo = t
    .replace(/\s+/g, " ")
    .replace(/^amazon\.com\.br\s*:\s*/i, "")
    .replace(SUFIXOS_LOJA, "")
    .trim();
  // Página sem produto (bloqueio, captcha, página genérica) tem o nome da loja como título.
  if (!limpo || /^(shopee(\s*brasil)?|mercado\s*livre|magazine\s*luiza|magalu)\s*[|\-–—:]/i.test(limpo) || /^(amazon(\.com\.br)?|mercado\s*livre|magazine\s*luiza|magalu|shopee(\s*brasil)?)$/i.test(limpo)) {
    return null;
  }
  return limpo.slice(0, 200);
}

/** Extração genérica: JSON-LD Product → Open Graph → Twitter Card → microdata → <title>. */
export function extrairGenerico($: CheerioAPI, url: URL): ProdutoExtraido {
  const produtos = produtosJsonLd($);
  const produto = produtos[0];

  let precoLd: number | null = null;
  for (const p of produtos) {
    precoLd = precoDeOfertas(p.offers);
    if (precoLd === null) {
      for (const v of lista(p.hasVariant)) {
        if (isObj(v)) precoLd = precoDeOfertas(v.offers);
        if (precoLd !== null) break;
      }
    }
    if (precoLd !== null) break;
  }

  const titulo = limparTitulo(
    (typeof produto?.name === "string" ? produto.name : null) ??
      meta($, "og:title", "twitter:title") ??
      $("title").first().text(),
  );

  const preco =
    precoLd ??
    parsePrice(meta($, "product:price:amount", "og:price:amount", "price")) ??
    parsePrice($('[itemprop="price"]').first().attr("content") ?? null);

  const imagens = normalizarImagens(
    [
      ...produtos.flatMap((p) => imagensJsonLd(p.image)),
      ...metas($, "og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"),
      $('link[rel="image_src"]').attr("href") ?? "",
    ],
    url,
  );

  return { titulo, preco, imagens, loja: url.hostname.replace(/^www\./, "") };
}
