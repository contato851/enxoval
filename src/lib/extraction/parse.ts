import { load } from "cheerio";
import { extrairGenerico } from "./generic";
import { amazon } from "./stores/amazon";
import { magalu } from "./stores/magalu";
import { mercadolivre } from "./stores/mercadolivre";
import { shopee } from "./stores/shopee";
import { ExtractionError, type Extractor, type ProdutoExtraido } from "./types";

/** Extratores por loja. Para adicionar uma loja, crie um arquivo em stores/ e registre aqui. */
export const EXTRATORES: Extractor[] = [amazon, mercadolivre, magalu, shopee];

/** Extrai os dados de um HTML já baixado. Separado do download para poder testar com fixtures. */
export function extractFromHtml(html: string, url: URL): ProdutoExtraido {
  const $ = load(html);
  const generico = extrairGenerico($, url);
  const loja = EXTRATORES.find((e) => e.matches(url));
  const especifico = loja?.extract($, url) ?? {};

  const resultado: ProdutoExtraido = {
    titulo: especifico.titulo ?? generico.titulo,
    preco: especifico.preco ?? generico.preco,
    imagens: [...new Set([...(especifico.imagens ?? []), ...generico.imagens])].slice(0, 8),
    loja: generico.loja,
  };

  if (!resultado.titulo && resultado.preco === null && resultado.imagens.length === 0) {
    throw new ExtractionError("sem_dados");
  }
  return resultado;
}
