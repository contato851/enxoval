import { limparTitulo } from "../generic";
import { parsePrice } from "../price";
import type { Extractor } from "../types";

/** Magalu traz JSON-LD Product; reforçamos com os atributos de teste da página. */
export const magalu: Extractor = {
  nome: "magalu",
  matches: (url) => /(^|\.)(magazineluiza|magalu)\.com(\.br)?$/.test(url.hostname),
  extract($) {
    const titulo = limparTitulo($('[data-testid="heading-product-title"]').first().text());
    const preco = parsePrice($('[data-testid="price-value"]').first().text() || null);
    return { titulo, preco };
  },
};
