import { limparTitulo, normalizarImagens } from "../generic";
import { parsePrice } from "../price";
import type { Extractor } from "../types";

/** Mercado Livre costuma trazer JSON-LD completo; aqui só reforçamos título, preço e galeria. */
export const mercadolivre: Extractor = {
  nome: "mercadolivre",
  matches: (url) => /(^|\.)mercadoli(vre|bre)\.com(\.br)?$/.test(url.hostname),
  extract($, url) {
    const titulo = limparTitulo($("h1.ui-pdp-title").first().text());
    const preco = parsePrice($('meta[itemprop="price"]').attr("content") ?? null);
    const imagens = normalizarImagens(
      $("figure.ui-pdp-gallery__figure img, img.ui-pdp-image")
        .map((_, el) => $(el).attr("data-zoom") ?? $(el).attr("src") ?? "")
        .get()
        .filter((u) => !u.includes("data:image")),
      url,
    );
    return { titulo, preco, imagens };
  },
};
