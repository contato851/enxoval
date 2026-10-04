import type { CheerioAPI } from "cheerio";

/** Resultado único do módulo de extração, independente de loja ou fornecedor. */
export type ProdutoExtraido = {
  titulo: string | null;
  preco: number | null;
  imagens: string[];
  loja: string | null;
};

/** Extrator específico de uma loja. Complementa (e tem prioridade sobre) o genérico. */
export interface Extractor {
  nome: string;
  matches(url: URL): boolean;
  /** Lança ExtractionError("bloqueado_pela_loja") se a página for captcha/bloqueio. */
  extract($: CheerioAPI, url: URL): Partial<ProdutoExtraido>;
}

export type CodigoErroExtracao =
  | "url_invalida"
  | "endereco_bloqueado"
  | "tempo_esgotado"
  | "muito_grande"
  | "bloqueado_pela_loja"
  | "tipo_invalido"
  | "sem_dados"
  | "falha_rede";

export class ExtractionError extends Error {
  constructor(
    public readonly codigo: CodigoErroExtracao,
    message?: string,
    public readonly status?: number,
  ) {
    super(message ?? codigo);
    this.name = "ExtractionError";
  }
}
