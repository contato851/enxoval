import { limparTitulo, normalizarImagens } from "../generic";
import { parsePrice } from "../price";
import { ExtractionError, type Extractor } from "../types";

/** Amazon quase não usa JSON-LD; os dados ficam no HTML da página do produto. */
export const amazon: Extractor = {
  nome: "amazon",
  matches: (url) => /(^|\.)amazon\.com(\.br)?$/.test(url.hostname),
  extract($, url) {
    if ($('form[action*="validateCaptcha"]').length > 0 || /api-services-support@amazon/.test($.html())) {
      throw new ExtractionError("bloqueado_pela_loja", "captcha da Amazon");
    }

    const titulo = limparTitulo($("#productTitle").text());

    const precoTexto =
      $("#corePrice_feature_div .a-offscreen").first().text() ||
      $("#corePriceDisplay_desktop_feature_div .a-offscreen").first().text() ||
      $(".priceToPay .a-offscreen").first().text() ||
      $("#priceblock_ourprice").text() ||
      $("#priceblock_dealprice").text();
    const preco =
      parsePrice(precoTexto || null) ??
      parsePrice($("#attach-base-product-price").attr("value") ?? null) ??
      parsePrice($("#twister-plus-price-data-price").attr("value") ?? null);

    const imagens: string[] = [];
    const principal = $("#landingImage, #imgBlkFront").first();
    const dinamica = principal.attr("data-a-dynamic-image");
    if (dinamica) {
      try {
        // Objeto { url: [largura, altura] }: fica com a maior.
        const mapa = JSON.parse(dinamica) as Record<string, [number, number]>;
        imagens.push(...Object.entries(mapa).sort((a, b) => b[1][0] - a[1][0]).map(([u]) => u));
      } catch {
        // ignora
      }
    }
    const hires = principal.attr("data-old-hires");
    if (hires) imagens.unshift(hires);
    // Miniaturas da galeria, trocando o sufixo de tamanho pelo tamanho grande.
    $("#altImages img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !/play-button|transparent-pixel/.test(src)) {
        imagens.push(src.replace(/\._[^/]*_\./, "._AC_SL1200_."));
      }
    });

    // A mesma foto aparece em vários tamanhos (._AC_SX300_, ._AC_SL1500_...): fica a primeira de cada.
    const vistas = new Set<string>();
    const unicas = imagens.filter((u) => {
      const chave = u.replace(/\._[^/]*_\./, ".");
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    });
    return { titulo, preco, imagens: normalizarImagens(unicas, url) };
  },
};
