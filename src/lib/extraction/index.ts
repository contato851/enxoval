import "server-only";
import { extractFromHtml } from "./parse";
import { safeFetch } from "./safe-fetch";
import { ExtractionError, type ProdutoExtraido } from "./types";

export { ExtractionError } from "./types";
export type { ProdutoExtraido, CodigoErroExtracao } from "./types";

/**
 * Ponto único de entrada da extração: url → { titulo, preco, imagens, loja }.
 * Para trocar por um serviço externo no futuro, basta reimplementar esta função.
 */
export async function extractProduct(url: string): Promise<ProdutoExtraido> {
  const res = await safeFetch(url, {
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    contentType: /^(text\/html|application\/xhtml\+xml)/i,
    timeoutMs: 8000,
    maxBytes: 2 * 1024 * 1024,
    aoPassarDoLimite: "truncar",
  });

  if (res.status >= 400) {
    throw new ExtractionError("bloqueado_pela_loja", `HTTP ${res.status}`, res.status);
  }

  return extractFromHtml(decodificar(res.body, res.contentType), res.url);
}

function decodificar(corpo: Buffer, contentType: string): string {
  const doCabecalho = contentType.match(/charset=([\w-]+)/i)?.[1];
  const doHtml = corpo.subarray(0, 2048).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (doCabecalho ?? doHtml ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset).decode(corpo);
  } catch {
    return new TextDecoder("utf-8").decode(corpo);
  }
}
