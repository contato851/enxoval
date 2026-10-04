import { limparTitulo } from "../generic";
import type { Extractor } from "../types";

/**
 * Shopee monta a página com JavaScript; sem as tags Open Graph não há dados.
 * Nesse caso a extração cai no plano B (colar imagem ou enviar foto).
 */
export const shopee: Extractor = {
  nome: "shopee",
  matches: (url) => /(^|\.)shopee\.com(\.br)?$/.test(url.hostname),
  extract($) {
    const titulo = limparTitulo($('meta[property="og:title"]').attr("content"));
    return titulo ? { titulo } : {};
  },
};
